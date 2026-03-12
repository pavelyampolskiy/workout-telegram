import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Spinner } from '../components/Spinner';
import { fmtW, DARK_CARD_STYLE } from '../shared';

function RecoveryBanner({ recoveryData }) {
  if (!recoveryData || recoveryData.modifier >= 1) return null;

  const reduction = Math.round((1 - recoveryData.modifier) * 100);

  return (
    <div
      className="mb-4 rounded-xl p-3 flex items-center gap-3"
      style={{
        background: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white/60 shrink-0">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <div className="flex-1">
        <div className="text-white/80 text-xs font-sans">
          Recovery: <span className="font-medium">{recoveryData.score}%</span>
        </div>
        <div className="text-white/50 text-[10px] font-sans">
          Consider {reduction}% lighter weights today
        </div>
      </div>
    </div>
  );
}

const REST_PRESETS = [60, 90, 120, 180];

function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
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
  const { params, goBack, setActiveWorkout, recoveryData, userId, showToast } = useApp();
  const { exIdx, exDbId, workoutId, day, customEx } = params;
  const exMapKey = exIdx;

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
  const [restDuration, setRestDuration] = useState(
    () => parseInt(localStorage.getItem('restDuration') || '90')
  );
  const [restEndTime, setRestEndTime] = useState(null);
  const [restTimer, setRestTimer] = useState(null);
  const [showPR, setShowPR] = useState(false);

  const weightRef = useRef(null);

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
          customEx ? Promise.resolve(null) : api.getProgram(),
          api.getSets(exDbId),
          api.getLastExercise(exDbId, workoutId),
        ]);
        setProgram(customEx ?? prog[day][exIdx]);
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
    const w = (weight === 'BW' || weight === 'BAR') ? 0 : parseFloat(weight.replace(',', '.'));
    const r = parseInt(reps);
    if (weight !== 'BW' && weight !== 'BAR' && (isNaN(w) || w < 0)) { setInputError('Enter weight'); return; }
    if (!r || r <= 0 || r > 100) { setInputError('Enter reps (1–100)'); return; }
    setInputError('');

    setSaving(true);
    try {
      const { id } = await api.addSet(exDbId, w, r);
      const updated = [...sets, { id, set_number: sets.length + 1, weight: w, reps: r }];
      setSets(updated);

      // Check for personal record
      const prevMax = Math.max(0, ...lastSets.map(s => s.weight), ...sets.map(s => s.weight));
      if (w > prevMax) {
        setShowPR(true);
        setTimeout(() => setShowPR(false), 2700);
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      } else {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      }
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 400);
      setRestEndTime(Date.now() + restDuration * 1000);
      // Schedule push notification via Telegram bot
      if (userId > 0) {
        api.startRestTimer(restDuration, ex?.name).catch(() => {});
      }
      setActiveWorkout(prev => prev ? {
        ...prev,
        exerciseMap: {
          ...prev.exerciseMap,
          [exMapKey]: { dbId: exDbId, setsCount: updated.length },
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
          [exMapKey]: { dbId: exDbId, setsCount: updated.length },
        },
      } : prev);
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleRestDurationChange = (val) => {
    setRestDuration(val);
    localStorage.setItem('restDuration', String(val));
  };

  const handleFinish = () => {
    // Cancel pending notification when leaving
    if (userId > 0 && restEndTime) {
      api.cancelRestTimer().catch(() => {});
    }
    goBack();
  };

  if (loading) {
    return (
      <div className="screen-root">
        <ScreenBg />
        <div className="relative z-10 flex items-center justify-center h-screen text-white/40 font-bebas tracking-wider" style={{ paddingTop: 'var(--app-top, 0px)' }}>Loading…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="screen-root">
        <ScreenBg />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-5 gap-4" style={{ paddingTop: 'var(--app-top, 0px)' }}>
          <p className="text-white/50 font-bebas tracking-wider text-center">Something went wrong</p>
          <div className="flex gap-3">
            <button onClick={goBack} className="card-press rounded-2xl px-6 py-3 font-bebas tracking-wider" style={DARK_CARD_STYLE}>Back</button>
            <button onClick={() => { setError(null); setLoading(true); window.location.reload(); }} className="card-press rounded-2xl px-6 py-3 font-bebas tracking-wider" style={DARK_CARD_STYLE}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const done = sets.length;
  const pct = Math.min((done / target) * 100, 100);

  return (
    <div className="screen-root">
      <ScreenBg />
      <div className="relative z-10 h-full overflow-y-auto overscroll-none px-5 pb-28" style={{ paddingTop: 'calc(var(--app-top, 0px) + 1.25rem)' }}>

      {/* Recovery banner */}
      <RecoveryBanner recoveryData={recoveryData} />

      {/* Exercise header */}
      <div className="pt-2 mb-5">
        <button onClick={handleFinish} className="flex items-center gap-1 mb-3 -ml-0.5">
          <span className="text-white/35 text-base leading-none">‹</span>
          <span className="font-bebas tracking-wider text-white/35 text-sm">{day.replace('DAY_', 'Day ')}</span>
        </button>
        <div className="flex items-center gap-2 mb-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white/40 shrink-0">
            <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
          </svg>
          <span className="text-xs font-bebas text-white/40 uppercase tracking-wide">{ex?.group}</span>
        </div>
        <h1 className="text-xl font-bebas tracking-wider text-white leading-tight">{ex?.name}</h1>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-bebas shrink-0 text-base tracking-wider">
            <span key={done} className="text-white counter-pop">{done}</span>
            <span className="text-white">/{target}</span>
            <span className="text-white/60"> sets</span>
          </span>
        </div>
      </div>

      {/* Rest timer */}
      {restTimer !== null && (
        <button
          onClick={() => setRestEndTime(null)}
          className="w-full rounded-2xl p-6 mb-4 text-center backdrop-blur-sm flex flex-col items-center"
          style={{ background: 'rgba(0,0,0,0.65)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04)' }}
        >
          <div className="text-[10px] font-bebas tracking-widest text-white/40 mb-3">REST</div>
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
          <div className="text-xs font-bebas text-white/25 mt-3">tap to skip</div>
        </button>
      )}

      {/* Last performance */}
      {lastDate && lastSets.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-1 text-xs text-white/35 mb-2 font-bebas">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3.5 3.5"/>
            </svg>
            Last time {lastDate}
          </div>
          <div className="flex flex-wrap gap-2">
            {lastSets.map((s, i) => (
              <span key={i} className="text-sm text-white/60 font-bebas">
                {fmtW(s.weight)}×{s.reps}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PR banner */}
      {showPR && (
        <div className="pr-banner w-full rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,255,255,0.06) 100%)', border: '1px solid rgba(255,215,0,0.25)', boxShadow: '0 0 20px rgba(255,215,0,0.08)' }}
        >
          <span className="text-2xl leading-none">🏆</span>
          <div>
            <div className="font-bebas tracking-wider text-base" style={{ color: 'rgba(255,215,0,0.90)' }}>New Record!</div>
            <div className="font-bebas tracking-wider text-xs text-white/35">Personal best weight</div>
          </div>
        </div>
      )}

      {/* Recorded sets */}
      {sets.length > 0 && (
        <div className="rounded-2xl p-4 mb-4 backdrop-blur-sm" style={DARK_CARD_STYLE}>
          <div className="text-xs text-white/40 mb-3 uppercase tracking-widest font-bebas">
            Recorded sets
          </div>
          <div className="space-y-2">
            {sets.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 ${i === sets.length - 1 ? 'row-in' : ''}`}>
                <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-white/40 text-xs font-bebas tracking-wider shrink-0">
                  {i + 1}
                </span>
                <span className="text-white/80 font-bebas text-sm">
                  {fmtW(s.weight)} kg × {s.reps} reps
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`rounded-2xl p-4 mb-4 backdrop-blur-sm overflow-hidden ${justSaved ? 'save-flash' : ''}`} style={DARK_CARD_STYLE}>
        <div className="text-xs mb-3 uppercase tracking-wider font-bebas" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Set {done + 1}
        </div>
        
        {/* Weight input with +/- buttons */}
        <div className="mb-4">
          <label className="text-xs mb-2 block font-bebas" style={{ color: 'rgba(255,255,255,0.57)' }}>Weight (kg)</label>
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
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bebas text-white/70 active:text-white active:bg-white/15 transition-colors shrink-0"
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
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bebas text-white/70 active:text-white active:bg-white/15 transition-colors shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              +
            </button>
          </div>
          <div className="text-[10px] text-white/35 font-sans mt-1.5">
            Use BAR for bar only, BW for bodyweight
          </div>
        </div>

        {/* Reps input with +/- buttons */}
        <div className="mb-4">
          <label className="text-xs mb-2 block font-bebas" style={{ color: 'rgba(255,255,255,0.57)' }}>Reps</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReps(r => String(Math.max(1, (parseInt(r) || 0) - 1)))}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bebas text-white/70 active:text-white active:bg-white/15 transition-colors shrink-0"
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
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bebas text-white/70 active:text-white active:bg-white/15 transition-colors shrink-0"
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
              : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }
          }
        >
          {saving ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner size={20} />
              Saving…
            </span>
          ) : justSaved ? (
            <span className="inline-flex items-center justify-center gap-2 text-white/90">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Saved
            </span>
          ) : (
            'Save Set'
          )}
        </button>

        {/* Rest duration picker */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-white/35 font-bebas uppercase tracking-wider shrink-0">Rest</span>
          <div className="flex gap-1.5">
            {REST_PRESETS.map(s => (
              <button
                key={s}
                onClick={() => handleRestDurationChange(s)}
                className="px-2.5 py-1 rounded-lg text-xs font-bebas tracking-wider transition-colors"
                style={restDuration === s
                  ? { background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.9)' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
                }
              >
                {s < 60 ? `${s}s` : s % 60 === 0 ? `${s / 60}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-gradient-to-t from-black via-black/95 to-transparent pt-6">
        <div className="flex gap-2">
          <button
            onClick={handleDeleteLast}
            disabled={!sets.length}
            className="flex-1 bg-white/6 active:bg-white/12 border border-white/8 disabled:opacity-20 text-white/40 active:text-white/70 font-bebas tracking-wider py-3 rounded-xl text-base transition-colors flex items-center justify-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
            Delete Last
          </button>
          <button
            onClick={handleFinish}
            className="card-press flex-1 border text-white/92 font-bebas tracking-wider py-3 rounded-xl text-base transition-colors flex items-center justify-center"
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
