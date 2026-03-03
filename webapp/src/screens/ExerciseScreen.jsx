import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';


function fmtW(w) {
  return w === Math.floor(w) ? String(Math.floor(w)) : String(w);
}

export default function ExerciseScreen() {
  const { params, goBack, setActiveWorkout } = useApp();
  const { exIdx, exDbId, workoutId, day, userId } = params;

  const [program, setProgram] = useState(null);
  const [sets, setSets] = useState([]);
  const [lastDate, setLastDate] = useState(null);
  const [lastSets, setLastSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [saving, setSaving] = useState(false);

  const weightRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
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
    if (!w || w <= 0) { alert('Enter weight'); return; }
    if (!r || r <= 0 || r > 100) { alert('Enter reps (1–100)'); return; }

    setSaving(true);
    try {
      const { id } = await api.addSet(exDbId, w, r);
      const updated = [...sets, { id, set_number: sets.length + 1, weight: w, reps: r }];
      setSets(updated);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      // Update active workout context
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
      alert(e.message);
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
      alert(e.message);
    }
  };

  const handleFinish = () => goBack();

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-white/40">Loading…</div>;
  }
  if (error) {
    return <div className="p-5 text-center text-red-400 pt-20">{error}</div>;
  }

  const done = sets.length;
  const pct = Math.min((done / target) * 100, 100);

  return (
    <div className="min-h-screen relative pb-28 overflow-hidden">
      <div className="absolute inset-0 scale-110" style={{ backgroundImage: 'url(/workout-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }} />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 p-5">
      {/* Exercise header */}
      <div className="pt-2 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white/40 shrink-0">
            <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
          </svg>
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{ex?.group}</span>
        </div>
        <h1 className="text-xl font-bebas tracking-wider text-white leading-tight">{ex?.name}</h1>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-bebas shrink-0 text-base tracking-wider">
            <span className="text-white/70">{done}/{target}</span>
            <span className="text-white/40"> sets</span>
          </span>
        </div>
      </div>

      {/* Last performance */}
      {lastDate && lastSets.length > 0 && (
        <div className="rounded-2xl p-3 mb-5 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.65)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)' }}>
          <div className="flex items-center gap-1 text-xs text-white/40 mb-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3.5 3.5"/>
            </svg>
            Last time ({lastDate})
          </div>
          <div className="flex flex-wrap gap-2">
            {lastSets.map((s, i) => (
              <span key={i} className="text-sm text-white/70 bg-white/8 rounded-lg px-2 py-0.5 font-mono">
                {fmtW(s.weight)}×{s.reps}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="rounded-2xl p-4 mb-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.65)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)' }}>
        <div className="text-xs text-white/40 mb-3 uppercase tracking-wider font-semibold">
          Set {done + 1}
        </div>
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs text-white/40 mb-1 block">Weight (kg)</label>
            <input
              ref={weightRef}
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="140"
              className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-white text-2xl font-bebas tracking-wider text-center outline-none focus:ring-2 focus:ring-white/30 placeholder-white/20"
            />
          </div>
          <div className="flex items-end pb-0.5 text-white/30 text-xl font-light">×</div>
          <div className="flex-1">
            <label className="text-xs text-white/40 mb-1 block">Reps</label>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              max="100"
              value={reps}
              onChange={e => setReps(e.target.value)}
              placeholder="12"
              className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-white text-2xl font-bebas tracking-wider text-center outline-none focus:ring-2 focus:ring-white/30 placeholder-white/20"
            />
          </div>
        </div>

        <button
          onClick={handleSaveSet}
          disabled={saving || !weight || !reps}
          className="card-press w-full bg-white/10 border border-white/20 disabled:bg-white/5 disabled:border-white/5 disabled:text-white/25 text-white/92 font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? 'Saving…' : '✓ Save Set'}
        </button>
      </div>

      {/* Recorded sets */}
      {sets.length > 0 && (
        <div className="rounded-2xl p-4 mb-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.65)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)' }}>
          <div className="text-xs text-white/40 mb-3 uppercase tracking-wider font-semibold">
            Recorded sets
          </div>
          <div className="space-y-2">
            {sets.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-white/40 text-xs font-mono shrink-0">
                  {i + 1}
                </span>
                <span className="text-white/80 font-mono text-sm">
                  {fmtW(s.weight)} kg × {s.reps} reps
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-gradient-to-t from-black via-black/95 to-transparent pt-6">
        <div className="flex gap-2">
          <button
            onClick={handleDeleteLast}
            disabled={!sets.length}
            className="flex-1 bg-white/10 active:bg-white/20 border border-white/10 disabled:opacity-30 text-white/50 active:text-white/80 font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
            Delete Last
          </button>
          <button
            onClick={handleFinish}
            className="card-press flex-1 bg-white/8 border border-white/15 text-white/92 font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Finish Exercise
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
