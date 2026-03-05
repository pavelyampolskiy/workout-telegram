import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { fmtW, DARK_CARD_STYLE } from '../shared';

const REST_DURATION = 90;

function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ExerciseScreen() {
  const { params, goBack, setActiveWorkout } = useApp();
  const { exIdx, exDbId, workoutId, day, userId, customEx } = params;

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
        setProgram(prog[day][exIdx]);
        setSets(setsData);
        setLastDate(lastData.date);
        setLastSets(lastData.sets);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  
  const ex = program;
  const target = ex?.target_sets || 4;

  const handleSaveSet = async () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!w || w <= 0) { setInputError('Enter weight'); return; }
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
      setRestEndTime(Date.now() + REST_DURATION * 1000);
      setActiveWorkout(prev => prev ? {
        ...prev,
        exerciseMap: {
          ...prev.exerciseMap,
          [exIdx]: { dbId: exDbId, setsCount: updated.length },
        },
      } : prev);
      setWeight('');
      setReps('');
      weightRef.current?.focus();
    } catch (e) {
      setInputError(e.message);
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
      setInputError(e.message);
    }
  };

  const handleFinish = () => goBack();

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <ScreenBg />
        <div className="relative z-10 flex items-center justify-center h-screen text-white/40 font-bebas tracking-wider">Loading…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <ScreenBg />
        <div className="relative z-10 flex items-center justify-center h-screen text-red-400/80 font-bebas tracking-wider p-5 text-center">{error}</div>
      </div>
    );
  }

  const done = sets.length;
  const pct = Math.min((done / target) * 100, 100);

  return (
    <div className="min-h-screen relative pb-28 overflow-hidden">
      <ScreenBg />
      <div className="relative z-10 px-5 pt-5 pb-28">

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
              className="h-full bg-white/60 rounded-full transition-all duration-300"
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
          className="w-full rounded-2xl p-4 mb-4 text-center backdrop-blur-sm"
          style={{ background: 'rgba(0,0,0,0.65)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04)' }}
        >
          <div className="text-[10px] font-bebas tracking-widest text-white/40 mb-0.5">REST</div>
          <div className="text-5xl font-bebas text-white leading-none">{fmtTime(restTimer)}</div>
          <div className="text-xs font-bebas text-white/25 mt-1.5">tap to skip</div>
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
      <div className={`rounded-2xl p-4 mb-4 backdrop-blur-sm ${justSaved ? 'save-flash' : ''}`} style={DARK_CARD_STYLE}>
        <div className="text-xs mb-3 uppercase tracking-wider font-bebas" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Set {done + 1}
        </div>
        
        {/* Weight input with +/- buttons */}
        <div className="mb-4">
          <label className="text-xs mb-2 block font-bebas" style={{ color: 'rgba(255,255,255,0.57)' }}>Weight (kg)</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeight(w => String(Math.max(0, (parseFloat(w) || 0) - 2.5)))}
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bebas text-white/70 active:text-white active:bg-white/15 transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              −
            </button>
            <input
              ref={weightRef}
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={weight}
              onChange={e => { setWeight(e.target.value); setInputError(''); }}
              placeholder="0"
              className="flex-1 h-14 appearance-none bg-black/50 border border-white/10 rounded-xl px-3 text-white text-3xl font-bebas tracking-wider text-center outline-none caret-white placeholder-white/20 focus:border-white/[0.22] focus:shadow-[inset_0_0_12px_rgba(255,255,255,0.04)]"
            />
            <button
              onClick={() => setWeight(w => String((parseFloat(w) || 0) + 2.5))}
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bebas text-white/70 active:text-white active:bg-white/15 transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              +
            </button>
          </div>
        </div>

        {/* Reps input with +/- buttons */}
        <div className="mb-4">
          <label className="text-xs mb-2 block font-bebas" style={{ color: 'rgba(255,255,255,0.57)' }}>Reps</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReps(r => String(Math.max(1, (parseInt(r) || 0) - 1)))}
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bebas text-white/70 active:text-white active:bg-white/15 transition-colors"
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
              className="flex-1 h-14 appearance-none bg-black/50 border border-white/10 rounded-xl px-3 text-white text-3xl font-bebas tracking-wider text-center outline-none caret-white placeholder-white/20 focus:border-white/[0.22] focus:shadow-[inset_0_0_12px_rgba(255,255,255,0.04)]"
            />
            <button
              onClick={() => setReps(r => String((parseInt(r) || 0) + 1))}
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bebas text-white/70 active:text-white active:bg-white/15 transition-colors"
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
          {saving ? 'Saving…' : 'Save Set'}
        </button>
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
