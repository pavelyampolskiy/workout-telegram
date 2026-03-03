import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';


function fmtW(w) {
  return w === Math.floor(w) ? String(Math.floor(w)) : String(w);
}

function dayLabel(type) {
  if (type === 'CARDIO') return 'Cardio';
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
    return <div className="flex items-center justify-center h-screen text-white/40">Loading…</div>;
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
          <span className="font-mono text-white/40 text-sm">{workout.date}</span>
        </div>
        <h1 className="text-xl font-bebas tracking-wider">{dayLabel(workout.type)}</h1>
      </div>

      {/* Cardio */}
      {workout.type === 'CARDIO' && workout.cardio && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-2xl p-4 mb-4">
          <div className="text-xs text-red-400 mb-1 font-semibold uppercase tracking-wider">Cardio</div>
          <p className="text-white/80">{workout.cardio}</p>
        </div>
      )}

      {/* Exercises */}
      {workout.exercises?.map(ex => (
        <div key={ex.id} className="bg-white/10 border border-white/10 rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white/40 shrink-0">
              <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
            </svg>
            <div>
              <div className="font-bebas tracking-wider text-base text-white">{ex.name}</div>
              <div className="text-xs text-white/30">{ex.grp}</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {ex.sets.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-white/40 text-xs font-mono shrink-0">
                  {i + 1}
                </span>
                <span className="text-white/70 font-mono text-sm">
                  {fmtW(s.weight)} kg × {s.reps} reps
                </span>
              </div>
            ))}
            {ex.sets.length === 0 && (
              <div className="text-white/30 text-sm">No sets recorded</div>
            )}
          </div>
        </div>
      ))}

      {/* Note */}
      {workout.note && (
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-1 text-xs text-white/40 mb-1 font-semibold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Note
          </div>
          <p className="text-white/70 text-sm">{workout.note}</p>
        </div>
      )}

      {/* Delete */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-gradient-to-t from-black via-black/95 to-transparent pt-6">
        {confirming ? (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 bg-white/10 border border-white/10 text-white/70 font-medium py-3 rounded-xl"
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
            className="w-full bg-white/10 active:bg-white/20 border border-red-900/40 text-red-400 font-medium py-3 rounded-2xl flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
            Delete Workout
          </button>
        )}
      </div>
    </div>
  );
}
