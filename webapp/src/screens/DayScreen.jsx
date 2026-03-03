import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

export default function DayScreen() {
  const { params, userId, navigate, resetTo, activeWorkout, setActiveWorkout } = useApp();
  const { day } = params;
  const dayLabel = day.replace('DAY_', 'Day ');

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // exerciseMap: { [exIdx]: { dbId, setsCount } }
  const exerciseMap = activeWorkout?.exerciseMap || {};
  const workoutId = activeWorkout?.id;

  useEffect(() => {
    async function init() {
      try {
        const prog = await api.getProgram();
        setProgram(prog[day]);

        // Create workout if not already active (or different day)
        if (!activeWorkout || activeWorkout.day !== day) {
          const { id } = await api.createWorkout(userId, day);
          setActiveWorkout({ id, day, exerciseMap: {} });
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleExerciseTap = async (idx) => {
    if (!workoutId) return;
    const ex = program[idx];

    // Create exercise in DB if not yet created
    let exDbId = exerciseMap[idx]?.dbId;
    if (!exDbId) {
      const { id } = await api.createExercise(workoutId, ex.group, ex.name, ex.target_sets);
      exDbId = id;
      setActiveWorkout(prev => ({
        ...prev,
        exerciseMap: { ...prev.exerciseMap, [idx]: { dbId: id, setsCount: 0 } },
      }));
    }

    navigate('exercise', { exIdx: idx, exDbId, workoutId, day, userId });
  };

  const handleSave = () => setShowNote(true);

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (note.trim() && workoutId) {
        await api.addNote(workoutId, note.trim());
      }
      resetTo('home');
    } catch (e) {
      setSaving(false);
      setError(e.message);
    }
  };

  const handleCancel = async () => {
    if (workoutId) {
      api.deleteWorkout(workoutId).catch(() => {});
    }
    resetTo('home');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-white/40">
        Setting up workout…
      </div>
    );
  }

  if (error) {
    return <div className="p-5 text-center text-red-400 pt-20">{error}</div>;
  }

  if (showNote) {
    return (
      <div className="p-5">
        <div className="pt-4 mb-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-green-400">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <h2 className="text-xl font-bebas tracking-wider mt-2">Workout saved!</h2>
          <p className="text-white/40 text-sm mt-1">Add a note (optional)</p>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="E.g. Felt strong today…"
          className="w-full bg-white/8 border border-white/10 rounded-xl p-3 text-white placeholder-white/20 resize-none h-28 outline-none mt-4 text-sm"
          autoFocus
        />
        <button
          onClick={handleFinish}
          disabled={saving}
          className="w-full mt-3 bg-green-600 active:bg-green-700 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          {saving ? 'Saving…' : 'Done'}
        </button>
        <button
          onClick={() => resetTo('home')}
          className="w-full mt-2 text-white/40 py-2 text-sm"
        >
          Skip
        </button>
      </div>
    );
  }

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="flex items-center justify-between p-5 pt-6">
        <h1 className="text-xl font-bebas tracking-wider">{dayLabel}</h1>
        <button onClick={handleCancel} className="text-red-400 text-sm font-medium">
          Cancel
        </button>
      </div>

      {/* Exercise list */}
      <div className="px-4 space-y-2">
        {program?.map((ex, idx) => {
          const info = exerciseMap[idx];
          const done = info?.setsCount || 0;
          const total = ex.target_sets;
          const complete = done >= total;

          return (
            <button
              key={idx}
              onClick={() => handleExerciseTap(idx)}
              className={`w-full rounded-2xl p-4 text-left flex items-center gap-3 transition-colors ${
                complete
                  ? 'bg-green-900/40 border border-green-800/60'
                  : 'bg-white/10 border border-white/10 active:bg-white/20'
              }`}
            >
              <span className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-white/40 text-xs font-mono shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`font-bebas tracking-wider text-base leading-tight ${complete ? 'text-green-400' : 'text-white'}`}>
                  {ex.name}
                </div>
                <div className="text-white/30 text-xs mt-1">{ex.group}</div>
                {/* Progress bar */}
                {done > 0 && (
                  <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden w-24">
                    <div
                      className={`h-full rounded-full transition-all ${complete ? 'bg-green-500' : 'bg-white/60'}`}
                      style={{ width: `${Math.min((done / total) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                {done > 0 && (
                  <span className={`text-sm font-mono ${complete ? 'text-green-400' : 'text-white/40'}`}>
                    {done}/{total}
                  </span>
                )}
                {!done && (
                  <span className="text-xs text-white/30">{total} sets</span>
                )}
                {complete ? (
                  <span className="text-green-400 text-lg">✓</span>
                ) : (
                  <span className="text-white/20 text-lg">›</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-gradient-to-t from-black via-black/95 to-transparent pt-6">
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 active:bg-blue-700 text-white font-bold py-4 rounded-2xl text-base transition-colors"
        >
          Save Workout
        </button>
      </div>
    </div>
  );
}
