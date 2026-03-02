import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';

const MUSCLE_EMOJI = {
  LEGS: '🦵', BACK: '🏋️', CHEST: '💪', BICEPS: '💪', TRICEPS: '🦾', SHOULDERS: '🎯',
};
const NUM_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

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
  const emoji = MUSCLE_EMOJI[ex?.group] || '💪';

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
    return <div className="flex items-center justify-center h-screen text-slate-400">Loading…</div>;
  }
  if (error) {
    return <div className="p-5 text-center text-red-400 pt-20">{error}</div>;
  }

  const done = sets.length;
  const pct = Math.min((done / target) * 100, 100);

  return (
    <div className="p-5 pb-28">
      {/* Exercise header */}
      <div className="pt-2 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{emoji}</span>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{ex?.group}</span>
        </div>
        <h1 className="text-xl font-bebas tracking-wider text-slate-100 leading-tight">{ex?.name}</h1>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm text-slate-400 font-mono shrink-0">
            {done}/{target} sets
          </span>
        </div>
      </div>

      {/* Last performance */}
      {lastDate && lastSets.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-3 mb-5 border border-slate-700/50">
          <div className="text-xs text-slate-400 mb-1.5">🕐 Last time ({lastDate})</div>
          <div className="flex flex-wrap gap-2">
            {lastSets.map((s, i) => (
              <span key={i} className="text-sm text-slate-300 bg-slate-700/60 rounded-lg px-2 py-0.5 font-mono">
                {fmtW(s.weight)}×{s.reps}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-slate-800 rounded-2xl p-4 mb-4">
        <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">
          Set {done + 1}
        </div>
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1 block">Weight (kg)</label>
            <input
              ref={weightRef}
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="140"
              className="w-full bg-slate-700 rounded-xl px-3 py-3 text-slate-100 text-lg font-mono text-center outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end pb-0.5 text-slate-500 text-xl font-light">×</div>
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1 block">Reps</label>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              max="100"
              value={reps}
              onChange={e => setReps(e.target.value)}
              placeholder="12"
              className="w-full bg-slate-700 rounded-xl px-3 py-3 text-slate-100 text-lg font-mono text-center outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleSaveSet}
          disabled={saving || !weight || !reps}
          className="w-full bg-blue-600 active:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? 'Saving…' : '✓ Save Set'}
        </button>
      </div>

      {/* Recorded sets */}
      {sets.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-4 mb-4">
          <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">
            Recorded sets
          </div>
          <div className="space-y-2">
            {sets.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-base shrink-0">{NUM_EMOJI[i] || `${i + 1}.`}</span>
                <span className="text-slate-200 font-mono text-sm">
                  {fmtW(s.weight)} kg × {s.reps} reps
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pt-6">
        <div className="flex gap-2">
          <button
            onClick={handleDeleteLast}
            disabled={!sets.length}
            className="flex-1 bg-slate-800 active:bg-slate-700 disabled:opacity-40 text-red-400 font-medium py-3 rounded-xl text-sm transition-colors"
          >
            🗑 Delete Last
          </button>
          <button
            onClick={handleFinish}
            className="flex-1 bg-green-600 active:bg-green-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            ✅ Finish Exercise
          </button>
        </div>
      </div>
    </div>
  );
}
