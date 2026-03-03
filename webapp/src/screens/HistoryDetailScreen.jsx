import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

const MONTHS_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function fmtW(w) {
  return w === Math.floor(w) ? String(Math.floor(w)) : String(w);
}

function dayLabel(type) {
  if (type === 'CARDIO') return 'Cardio';
  return type.replace('DAY_', 'Day ');
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day} ${MONTHS_ABBR[parseInt(month) - 1]} ${year}`;
}

const CARD_STYLE = {
  background: 'rgba(0,0,0,0.65)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)',
};

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

  const screenBg = (
    <>
      <div className="absolute inset-0 scale-110" style={{ backgroundImage: 'url(/workout-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }} />
      <div className="absolute inset-0 bg-black/65" />
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {screenBg}
        <div className="relative z-10 flex items-center justify-center h-screen text-white/40 font-bebas tracking-wider">Loading…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {screenBg}
        <div className="relative z-10 flex items-center justify-center h-screen text-red-400/80 font-bebas tracking-wider p-5 text-center">{error}</div>
      </div>
    );
  }
  if (!workout) return null;

  return (
    <div className="min-h-screen relative overflow-hidden pb-28">
      <div className="absolute inset-0 scale-110" style={{ backgroundImage: 'url(/workout-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }} />
      <div className="absolute inset-0 bg-black/65" />

      <div className="relative z-10 p-5">
        {/* Header */}
        <div className="pt-2 mb-5">
          <div className="font-sans text-white/35 text-sm mb-0.5">{formatDate(workout.date)}</div>
          <h1 className="font-bebas tracking-wider" style={{ fontSize: '7vw', letterSpacing: '0.08em' }}>{dayLabel(workout.type)}</h1>
        </div>

        {/* Cardio */}
        {workout.type === 'CARDIO' && workout.cardio && (
          <div className="backdrop-blur-sm rounded-2xl p-4 mb-3" style={CARD_STYLE}>
            <div className="font-sans text-white/40 text-sm mb-1">Cardio</div>
            <p className="text-white/80 text-sm">{workout.cardio}</p>
          </div>
        )}

        {/* Exercises */}
        {workout.exercises?.map(ex => (
          <div key={ex.id} className="backdrop-blur-sm rounded-2xl p-4 mb-3" style={CARD_STYLE}>
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
                  <span className="w-5 h-5 rounded-full border border-white/15 flex items-center justify-center text-white/35 text-xs font-sans shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-white/70 font-sans text-sm">
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
          <div className="backdrop-blur-sm rounded-2xl p-4 mb-3" style={CARD_STYLE}>
            <div className="font-sans text-white/40 text-sm mb-1">Note</div>
            <p className="text-white/70 text-sm">{workout.note}</p>
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-gradient-to-t from-black via-black/95 to-transparent pt-6">
        {confirming ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="card-press w-full text-white/90 font-bebas tracking-wider text-lg py-4 rounded-2xl"
              style={{ background: 'rgba(0,0,0,0.10)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 0 18px rgba(255,255,255,0.06), 0 0 6px rgba(255,255,255,0.04)' }}
            >
              Keep workout
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full text-white/40 active:text-white/70 disabled:opacity-40 py-3 font-bebas tracking-wider text-sm transition-colors"
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-full text-white/35 active:text-white/60 py-3 font-bebas tracking-wider text-sm transition-colors flex items-center justify-center gap-2"
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
