import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE } from '../shared';

export default function DayScreen() {
  const { params, userId, navigate, resetTo, activeWorkout, setActiveWorkout } = useApp();
  const { day } = params;
  const dayLabel = day.replace('DAY_', 'Day ');

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(3);
  const [saving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [durationMin, setDurationMin] = useState(null);

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
          setActiveWorkout({ id, day, exerciseMap: {}, startedAt: Date.now() });
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

  const handleSave = () => {
    const mins = activeWorkout?.startedAt
      ? Math.round((Date.now() - activeWorkout.startedAt) / 60000)
      : null;
    setDurationMin(mins);
    if (workoutId) api.finishWorkout(workoutId).catch(() => {});
    setShowNote(true);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (workoutId) {
        await api.saveRating(workoutId, rating);
      }
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
      <div className="min-h-screen relative overflow-hidden">
        <ScreenBg overlay="bg-black/65" />
        <div className="relative z-10 flex items-center justify-center h-screen text-white/40 font-bebas tracking-wider">Setting up workout…</div>
      </div>
    );
  }

  if (error) {
    return <div className="p-5 text-center text-red-400 pt-20">{error}</div>;
  }

  if (showNote) {
    return (
      <div className="min-h-screen relative">
        <ScreenBg overlay="bg-black/70" fixed />
        <div className="relative z-10 p-5">
          <div className="pt-4 mb-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-white/60">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <h2 className="text-xl font-bebas tracking-wider mt-2">Workout saved!</h2>
            {durationMin !== null && durationMin > 0 && (
              <p className="text-white/55 text-sm mt-1 font-bebas tracking-wider">{durationMin} min</p>
            )}
          </div>

          {/* Rating slider */}
          <div className="mb-5">
            <p className="font-sans text-white/60 text-xs mb-3">How was your workout?</p>
            <div className="flex justify-between font-bebas text-xs tracking-widest text-white/35 mb-2.5">
              <span>Easy</span>
              <span>Hard</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={rating}
              onChange={e => setRating(Number(e.target.value))}
              className="rating-slider"
              style={{
                background: `linear-gradient(to right, rgba(255,255,255,0.65) ${(rating - 1) / 4 * 100}%, rgba(255,255,255,0.1) ${(rating - 1) / 4 * 100}%)`,
              }}
            />
          </div>

          <p className="font-sans text-white/25 text-xs mb-2">Add a note (optional)</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="E.g. Felt strong today…"
            className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl p-3 text-white placeholder-white/25 resize-none h-28 outline-none mt-4 text-sm font-sans"
            autoFocus
          />
          <button
            onClick={handleFinish}
            disabled={saving}
            className="card-press w-full mt-3 text-white/92 font-bebas tracking-wider text-lg py-4 rounded-2xl"
            style={CARD_BTN_STYLE}
          >
            {saving ? 'Saving…' : 'Done'}
          </button>
          <button
            onClick={() => resetTo('home')}
            className="w-full mt-2 text-white/40 py-2 font-bebas tracking-wider text-sm"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pb-32 overflow-hidden">
      <ScreenBg overlay="bg-black/65" />
      <div className="relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-5 pt-6">
        <h1 className="text-xl font-bebas text-white/85" style={{ letterSpacing: '0.08em' }}>{dayLabel}</h1>
        <button onClick={() => setShowCancelConfirm(true)} className="text-white/60 active:text-white/85 font-bebas tracking-wider text-sm transition-colors">
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
              className="card-press w-full rounded-2xl p-4 text-left flex items-center gap-3 transition-colors"
              style={{ ...CARD_BTN_STYLE, ...(complete && { background: 'rgba(255,255,255,0.12)' }) }}
            >
              <span className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-white/40 text-xs font-bebas tracking-wider shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`font-bebas tracking-wider text-base leading-tight ${complete ? 'text-white' : 'text-white/80'}`}>
                  {ex.name}
                </div>
                <div className="text-white/30 text-xs mt-1">{ex.group}</div>
                {/* Progress bar */}
                {done > 0 && (
                  <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden w-full">
                    <div
                      className={`h-full rounded-full transition-all ${complete ? 'bg-white/80' : 'bg-white/60'}`}
                      style={{ width: `${Math.min((done / total) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                {done > 0 && (
                  <span className={`text-sm font-bebas tracking-wider ${complete ? 'text-white/70' : 'text-white/40'}`}>
                    {done}/{total}
                  </span>
                )}
                {!done && (
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-sm font-bebas tracking-wider text-white/70">{total}</span>
                    <span className="text-[9px] uppercase tracking-wider text-white/35 mt-0.5">sets</span>
                  </div>
                )}
                {complete ? (
                  <span className="text-white/70 text-lg">✓</span>
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
          className="card-press w-full text-white/92 font-bebas tracking-wider text-lg py-4 rounded-2xl"
          style={CARD_BTN_STYLE}
        >
          Save Workout
        </button>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="mx-6 w-full max-w-sm bg-black/90 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-1">Cancel workout?</h3>
            <p className="text-sm text-white/40 mb-6 font-sans">All progress will be lost.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="card-press w-full text-white/90 font-bebas tracking-wider text-base py-3 rounded-xl"
                style={CARD_BTN_STYLE}
              >
                Keep working
              </button>
              <button
                onClick={handleCancel}
                className="w-full text-white/50 active:text-white/80 py-3 font-bebas tracking-wider text-sm transition-colors"
              >
                Cancel workout
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
