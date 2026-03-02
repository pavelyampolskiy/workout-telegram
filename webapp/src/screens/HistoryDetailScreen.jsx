import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

const MUSCLE_EMOJI = {
  LEGS: '🦵', BACK: '🏋️', CHEST: '💪', BICEPS: '💪', TRICEPS: '🦾', SHOULDERS: '🎯',
};
const NUM_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

function fmtW(w) {
  return w === Math.floor(w) ? String(Math.floor(w)) : String(w);
}

function dayLabel(type) {
  if (type === 'CARDIO') return '❤️ Cardio';
  return type.replace('DAY_', 'Day ');
}

export default function HistoryDetailScreen() {
  const { params, goBack } = useApp();
  const { workoutId } = params;

  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.getWorkout(workoutId)
      .then(setWorkout)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteWorkout(workoutId);
      goBack();
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-slate-400">Loading…</div>;
  }
  if (error) {
    return <div className="p-5 text-center text-red-400 pt-20">{error}</div>;
  }
  if (!workout) return null;

  return (
    <div className="p-5 pb-28">
      {/* Header */}
      <div className="pt-2 mb-5">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-slate-400 text-sm">{workout.date}</span>
        </div>
        <h1 className="text-xl font-bebas tracking-wider">{dayLabel(workout.type)}</h1>
      </div>

      {/* Cardio */}
      {workout.type === 'CARDIO' && workout.cardio && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-2xl p-4 mb-4">
          <div className="text-xs text-red-400 mb-1 font-semibold uppercase tracking-wider">Cardio</div>
          <p className="text-slate-200">{workout.cardio}</p>
        </div>
      )}

      {/* Exercises */}
      {workout.exercises?.map(ex => (
        <div key={ex.id} className="bg-slate-800 rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{MUSCLE_EMOJI[ex.grp] || '💪'}</span>
            <div>
              <div className="font-bebas tracking-wider text-base text-slate-100">{ex.name}</div>
              <div className="text-xs text-slate-500">{ex.grp}</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {ex.sets.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-sm shrink-0">{NUM_EMOJI[i] || `${i + 1}.`}</span>
                <span className="text-slate-300 font-mono text-sm">
                  {fmtW(s.weight)} kg × {s.reps} reps
                </span>
              </div>
            ))}
            {ex.sets.length === 0 && (
              <div className="text-slate-500 text-sm">No sets recorded</div>
            )}
          </div>
        </div>
      ))}

      {/* Note */}
      {workout.note && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-4">
          <div className="text-xs text-slate-400 mb-1 font-semibold">📝 Note</div>
          <p className="text-slate-300 text-sm">{workout.note}</p>
        </div>
      )}

      {/* Delete */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pt-6">
        {confirming ? (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 bg-slate-700 text-slate-300 font-medium py-3 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 active:bg-red-700 text-white font-semibold py-3 rounded-xl"
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-full bg-slate-800 active:bg-slate-700 text-red-400 font-medium py-3 rounded-2xl border border-red-900/40"
          >
            🗑 Delete Workout
          </button>
        )}
      </div>
    </div>
  );
}
