import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { Spinner } from '../components/Spinner';
import { fmtW, fmtTime, DARK_CARD_STYLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_MUTED, TEXT_FADED } from '../shared';

const REST_PRESETS = [60, 90, 120, 160];
const REST_STORAGE_KEY = 'workout_rest_duration';

function getStoredRestDuration() {
  try {
    const v = parseInt(localStorage.getItem(REST_STORAGE_KEY), 10);
    return REST_PRESETS.includes(v) ? v : 90;
  } catch {
    return 90;
  }
}

// Play a beep sound using Web Audio API
function playTimerSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    
    oscillator.frequency.value = 880; // A5 note
    oscillator.type = 'sine';
    gain.gain.value = 0.3;
    
    oscillator.start();
    
    // Fade out
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    oscillator.stop(ctx.currentTime + 0.5);
    
    // Second beep after short pause
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1100; // Higher pitch
        osc2.type = 'sine';
        gain2.gain.value = 0.3;
        osc2.start();
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.5);
      } catch (_) {}
    }, 200);
  } catch (_) {}
}

export default function ExerciseScreen() {
  const { params, goBack, setActiveWorkout, userId, showToast } = useApp();
  const { exIdx, exDbId, workoutId, day, customEx } = params;

  const [program, setProgram] = useState(null);
  const [sets, setSets] = useState([]);
  const [lastDate, setLastDate] = useState(null);
  const [lastSets, setLastSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [inputError, setInputError] = useState('');
  const [restEndTime, setRestEndTime] = useState(null);
  const [restTimer, setRestTimer] = useState(null);
  const [restDuration, setRestDuration] = useState(getStoredRestDuration);

  const weightRef = useRef(null);

  const saveRestDuration = (sec) => {
    localStorage.setItem(REST_STORAGE_KEY, String(sec));
    setRestDuration(sec);
  };

  // Rest timer - uses endTime to survive app minimize
  useEffect(() => {
    if (restEndTime === null) {
      setRestTimer(null);
      return;
    }
    
    const tick = () => {
      const remaining = Math.max(0, Math.round((restEndTime - Date.now()) / 1000));
      setRestTimer(remaining);
      
      if (remaining <= 0) {
        playTimerSound();
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        setRestEndTime(null);
      }
    };
    
    tick(); // Initial tick
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [restEndTime]);

  useEffect(() => {
    async function init() {
      try {
        // If it's a custom exercise, use the passed data
        if (customEx) {
          setProgram(customEx);
          const setsData = await api.getSets(exDbId);
          setSets(setsData);
          setLoading(false);
          return;
        }

        const [prog, setsData, lastData] = await Promise.all([
          api.getProgram(),
          api.getSets(exDbId),
          api.getLastExercise(exDbId, userId, workoutId),
        ]);
        const exData = prog[day]?.[exIdx];
        if (!exData) {
          setError('Exercise not found');
          setLoading(false);
          return;
        }
        setProgram(exData);
        setSets(setsData);
        setLastDate(lastData.date);
        setLastSets(lastData.sets);
        
        // Auto-fill from last workout's first set (if no sets done yet)
        if (setsData.length === 0 && lastData.sets?.length > 0) {
          const firstLastSet = lastData.sets[0];
          setWeight(firstLastSet.weight === 0 ? 'BAR' : String(firstLastSet.weight));
          setReps(String(firstLastSet.reps));
        }
      } catch (e) {
        setError(e.message);
        showToast(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  
  const ex = program;
  const target = ex?.target_sets || 4;

  const handleSaveSet = async () => {
    const w = (weight === 'BW' || weight === 'BAR') ? 0 : parseFloat(weight);
    const r = parseInt(reps);
    if (weight !== 'BW' && weight !== 'BAR' && (isNaN(w) || w < 0)) { setInputError('Enter weight'); return; }
    if (!r || r <= 0 || r > 100) { setInputError('Enter reps (1–100)'); return; }
    setInputError('');

    setSaving(true);
    try {
      const { id } = await api.addSet(exDbId, w, r);
      const updated = [...sets, { id, set_number: sets.length + 1, weight: w, reps: r }];
      setSets(updated);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 400);
      setRestEndTime(Date.now() + restDuration * 1000);
      // Schedule push notification via Telegram bot
      if (userId > 0) {
        api.startRestTimer(userId, restDuration, ex?.name).catch(() => {});
      }
      setActiveWorkout(prev => prev ? {
        ...prev,
        exerciseMap: {
          ...prev.exerciseMap,
          [exIdx]: { dbId: exDbId, setsCount: updated.length },
        },
      } : prev);
      // Auto-fill for next set: prefer last workout's corresponding set, fallback to just saved values
      const nextSetIdx = updated.length; // 0-indexed, so this is the index of the NEXT set
      if (lastSets && lastSets[nextSetIdx]) {
        const nextLastSet = lastSets[nextSetIdx];
        setWeight(nextLastSet.weight === 0 ? 'BAR' : String(nextLastSet.weight));
        setReps(String(nextLastSet.reps));
      } else {
        // Fallback: keep the same weight/reps from the set we just saved
        setWeight(w === 0 ? 'BAR' : String(w));
        setReps(String(r));
      }
      weightRef.current?.focus();
    } catch (e) {
      showToast(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLast = async () => {
    if (!sets.length) return;
    const last = sets[sets.length - 1];
    try {
      await api.deleteSet(last.id);
      const updated = sets.slice(0, -1);
      setSets(updated);
      setActiveWorkout(prev => prev ? {
        ...prev,
        exerciseMap: {
          ...prev.exerciseMap,
          [exIdx]: { dbId: exDbId, setsCount: updated.length },
        },
      } : prev);
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleFinish = () => {
    // Cancel pending notification when leaving
    if (userId > 0 && restEndTime) {
      api.cancelRestTimer(userId).catch(() => {});
    }
    goBack();
  };

  if (loading) {
    return <LoadingScreen image="/gym-bg.jpg" />;
  }
  if (error) {
    return (
      <ErrorScreen
        image="/gym-bg.jpg"
        onBack={goBack}
        onRetry={() => { setError(null); setLoading(true); window.location.reload(); }}
      />
    );
  }

  const done = sets.length;
  const pct = Math.min((done / target) * 100, 100);

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden pb-28">
      <ScreenBg image="/gym-bg.jpg" />
      <div className="relative z-10 flex-1 min-h-0 px-5 safe-top pt-8 pb-28 overflow-y-auto">

      {/* Exercise header */}
      <div className="pt-6 mb-5">
        <button onClick={handleFinish} className="flex items-center gap-1 mb-3 -ml-0.5">
          <span className={`${TEXT_MUTED} text-base leading-none`}>‹</span>
          <span className={`font-bebas tracking-wider ${TEXT_MUTED} text-sm`}>
            {day?.startsWith?.('CUSTOM') ? 'Custom' : (day || 'Workout').replace('DAY_', 'Day ')}
          </span>
        </button>
        <div className="flex items-center gap-2 mb-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${TEXT_MUTED} shrink-0`}>
            <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
          </svg>
          <span className={`text-xs font-bebas uppercase tracking-wide ${TEXT_MUTED}`}>{ex?.group}</span>
        </div>
        <h1 className={`text-xl font-bebas tracking-wider leading-tight ${TEXT_PRIMARY}`}>{ex?.name}</h1>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-bebas shrink-0 text-base tracking-wider">
            <span key={done} className={`${TEXT_PRIMARY} counter-pop`}>{done}</span>
            <span className={TEXT_PRIMARY}>/{target}</span>
            <span className={TEXT_TERTIARY}> sets</span>
          </span>
        </div>
      </div>

      {/* Rest timer + preset */}
      {restTimer !== null && (
        <>
          <button
            onClick={() => setRestEndTime(null)}
            className="w-full rounded-2xl p-6 mb-4 text-center backdrop-blur-sm flex flex-col items-center"
            style={{ background: 'rgba(0,0,0,0.65)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04)' }}
          >
            <div className={`text-[10px] font-bebas tracking-widest mb-3 ${TEXT_MUTED}`}>REST</div>
            <div className="relative">
              <svg width={120} height={120} className="transform -rotate-90">
                <circle
                  cx={60}
                  cy={60}
                  r={52}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={6}
                />
                <circle
                  cx={60}
                  cy={60}
                  r={52}
                  fill="none"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={326.7}
                  strokeDashoffset={326.7 - (1 - restTimer / restDuration) * 326.7}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bebas text-white leading-none">{fmtTime(restTimer)}</span>
              </div>
            </div>
            <div className={`text-xs font-bebas mt-3 ${TEXT_FADED}`}>tap to skip</div>
          </button>
          <div className="mb-4">
            <div className={`text-[10px] mb-1.5 font-bebas ${TEXT_MUTED}`}>Rest timer</div>
            <div className="flex gap-1.5">
              {REST_PRESETS.map((sec) => (
                <button
                  key={sec}
                  onClick={() => saveRestDuration(sec)}
                  className={`px-2.5 py-1 rounded-lg font-bebas tracking-wider text-xs transition-colors ${
                    restDuration === sec
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-white/50 border border-white/10 active:bg-white/10'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Last performance */}
      {lastDate && lastSets.length > 0 && (
        <div className="mb-5">
          <div className={`flex items-center gap-1 text-xs mb-2 font-bebas ${TEXT_MUTED}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3.5 3.5"/>
            </svg>
            Last time {lastDate}
          </div>
          <div className="flex flex-wrap gap-2">
            {lastSets.map((s, i) => (
              <span key={i} className={`text-sm font-bebas ${TEXT_TERTIARY}`}>
                {fmtW(s.weight)}×{s.reps}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recorded sets */}
      {sets.length > 0 && (
        <div className="rounded-2xl p-4 mb-4 backdrop-blur-sm" style={DARK_CARD_STYLE}>
          <div className={`text-xs mb-3 uppercase tracking-widest font-bebas ${TEXT_MUTED}`}>
            Recorded sets
          </div>
          <div className="space-y-2">
            {sets.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 ${i === sets.length - 1 ? 'row-in' : ''}`}>
                <span className={`w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-xs font-bebas tracking-wider shrink-0 ${TEXT_MUTED}`}>
                  {i + 1}
                </span>
                <span className={`font-bebas text-sm ${TEXT_SECONDARY}`}>
                  {fmtW(s.weight)} kg × {s.reps} reps
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`rounded-2xl p-4 mb-4 backdrop-blur-sm overflow-hidden ${justSaved ? 'save-flash' : ''}`} style={DARK_CARD_STYLE}>
        <div className={`text-xs mb-3 uppercase tracking-wider font-bebas ${TEXT_TERTIARY}`}>
          Set {done + 1}
        </div>
        
        {/* Weight input with +/- buttons */}
        <div className="mb-4">
          <label className={`text-xs mb-2 block font-bebas ${TEXT_MUTED}`}>Weight (kg)</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (weight === 'BW') return;
                if (weight === '' || weight === '0' || weight === 'BAR') { setWeight('BW'); return; }
                const w = parseFloat(weight) || 0;
                if (w <= 1.25) { setWeight('BAR'); return; }
                if (w <= 2.5) { setWeight('1.25'); return; }
                setWeight(String(w - 2.5));
              }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bebas active:text-white active:bg-white/15 transition-colors shrink-0 ${TEXT_SECONDARY}`}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              −
            </button>
            <input
              ref={weightRef}
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={e => { setWeight(e.target.value); setInputError(''); }}
              placeholder="0"
              className="flex-1 min-w-0 h-12 appearance-none bg-black/50 border border-white/10 rounded-xl px-3 text-white text-2xl font-bebas tracking-wider text-center outline-none caret-white placeholder-white/20 focus:border-white/[0.22] focus:shadow-[inset_0_0_12px_rgba(255,255,255,0.04)]"
            />
            <button
              onClick={() => {
                if (weight === 'BW') { setWeight('BAR'); return; }
                if (weight === 'BAR') { setWeight('1.25'); return; }
                const w = parseFloat(weight) || 0;
                if (w < 1.25) { setWeight('1.25'); return; }
                if (w < 2.5) { setWeight('2.5'); return; }
                setWeight(String(w + 2.5));
              }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bebas active:text-white active:bg-white/15 transition-colors shrink-0 ${TEXT_SECONDARY}`}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              +
            </button>
          </div>
          <div className={`text-[10px] font-sans mt-1.5 ${TEXT_MUTED}`}>
            Use BAR for bar only, BW for bodyweight
          </div>
        </div>

        {/* Reps input with +/- buttons */}
        <div className="mb-4">
          <label className={`text-xs mb-2 block font-bebas ${TEXT_MUTED}`}>Reps</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReps(r => String(Math.max(1, (parseInt(r) || 0) - 1)))}
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bebas active:text-white active:bg-white/15 transition-colors shrink-0 ${TEXT_SECONDARY}`}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              max="100"
              value={reps}
              onChange={e => { setReps(e.target.value); setInputError(''); }}
              placeholder="0"
              className="flex-1 min-w-0 h-12 appearance-none bg-black/50 border border-white/10 rounded-xl px-3 text-white text-2xl font-bebas tracking-wider text-center outline-none caret-white placeholder-white/20 focus:border-white/[0.22] focus:shadow-[inset_0_0_12px_rgba(255,255,255,0.04)]"
            />
            <button
              onClick={() => setReps(r => String((parseInt(r) || 0) + 1))}
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bebas active:text-white active:bg-white/15 transition-colors shrink-0 ${TEXT_SECONDARY}`}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              +
            </button>
          </div>
        </div>

        {inputError && (
          <div className="text-xs font-bebas text-red-400/80 text-center mb-2">{inputError}</div>
        )}

        <button
          onClick={handleSaveSet}
          disabled={saving || !weight || !reps}
          className="card-press w-full rounded-xl py-3 font-bebas tracking-wider text-lg transition-all disabled:bg-white/5 disabled:border-white/5 disabled:text-white/25 border"
          style={
            weight && reps
              ? { background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.30)', color: 'rgba(255,255,255,1)' }
              : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }
          }
        >
          {saving ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner size={20} />
              Saving…
            </span>
          ) : justSaved ? (
            <span className={`inline-flex items-center justify-center gap-2 ${TEXT_PRIMARY}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Saved
            </span>
          ) : (
            'Save Set'
          )}
        </button>
      </div>

      {/* Action buttons */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 safe-bottom">
        <div className="flex gap-2">
          <button
            onClick={handleDeleteLast}
            disabled={!sets.length}
            className={`flex-1 bg-white/6 active:bg-white/12 border border-white/8 disabled:opacity-20 font-bebas tracking-wider py-3 rounded-xl text-base transition-colors flex items-center justify-center gap-1.5 ${TEXT_MUTED} active:text-white/80`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
            Delete Last
          </button>
          <button
            onClick={handleFinish}
            className={`card-press flex-1 border font-bebas tracking-wider py-3 rounded-xl text-base transition-colors flex items-center justify-center ${TEXT_PRIMARY}`}
            style={{ background: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.22)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
          >
            Finish Exercise
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
