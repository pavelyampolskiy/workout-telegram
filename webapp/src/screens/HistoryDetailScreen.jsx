import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { ErrorScreen } from '../components/ErrorScreen';
import { HistoryDetailSkeleton } from '../components/Skeleton';
import { Spinner } from '../components/Spinner';
import { ExerciseNameInput } from '../components/ExerciseNameInput';
import { formatDate, fmtW, fmtWorkoutType, DARK_CARD_STYLE, CARD_BTN_STYLE, SECONDARY_CARD_STYLE, PAGE_HEADING_STYLE } from '../shared';
import { MUSCLE_GROUPS } from '../constants';

export default function HistoryDetailScreen() {
  const { params, goBack, showToast } = useApp();
  const { workoutId } = params;

  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingSet, setEditingSet] = useState(null); // { exId, setId, weight, reps }
  const [saving, setSaving] = useState(false);
  const [deletingSetId, setDeletingSetId] = useState(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [customExName, setCustomExName] = useState('');
  const [customExGroup, setCustomExGroup] = useState('CHEST');
  const [addingEx, setAddingEx] = useState(false);
  const [editNote, setEditNote] = useState('');
  useEffect(() => {
    if (!workoutId) return;
    api.getWorkout(workoutId)
      .then(setWorkout)
      .catch(e => { setError(e.message); showToast(e.message); })
      .finally(() => setLoading(false));
  }, [workoutId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteWorkout(workoutId);
      goBack();
    } catch (e) {
      showToast(e.message);
      setDeleting(false);
    }
  };

  const handleEditSet = (exId, set) => {
    setEditingSet({ exId, setId: set.id, weight: String(set.weight), reps: String(set.reps) });
  };

  const handleSaveSet = async () => {
    if (!editingSet) return;
    const weight = parseFloat(String(editingSet.weight).replace(',', '.'));
    const reps = parseInt(editingSet.reps);
    if (isNaN(weight) || weight < 0 || isNaN(reps) || reps <= 0) return;
    
    setSaving(true);
    try {
      await api.updateSet(editingSet.setId, weight, reps);
      // Update local state
      setWorkout(prev => ({
        ...prev,
        exercises: prev.exercises.map(ex => 
          ex.id === editingSet.exId 
            ? {
                ...ex,
                sets: ex.sets.map(s => 
                  s.id === editingSet.setId ? { ...s, weight, reps } : s
                ),
                volume: ex.sets.reduce((sum, s) => 
                  sum + (s.id === editingSet.setId ? weight * reps : s.weight * s.reps), 0
                ),
              }
            : ex
        ),
      }));
      setEditingSet(null);
    } catch (e) {
      showToast(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSet = async (exId, setId) => {
    setDeletingSetId(setId);
    setSaving(true);
    try {
      await api.deleteSet(setId);
      setWorkout(prev => {
        const updated = prev.exercises.map(ex => {
          if (ex.id !== exId) return ex;
          const remaining = ex.sets.filter(s => s.id !== setId);
          return { ...ex, sets: remaining, volume: remaining.reduce((sum, s) => sum + s.weight * s.reps, 0) };
        });
        const empty = updated.find(ex => ex.id === exId && ex.sets.length === 0);
        if (empty) {
          api.deleteExercise(exId).catch(e => showToast(e.message));
          return { ...prev, exercises: updated.filter(ex => ex.id !== exId) };
        }
        return { ...prev, exercises: updated };
      });
    } catch (e) {
      showToast(e.message);
    } finally {
      setSaving(false);
      setDeletingSetId(null);
    }
  };

  const handleAddExercise = async () => {
    if (!customExName.trim()) return;
    setAddingEx(true);
    try {
      const { id } = await api.createExercise(workoutId, customExGroup, customExName.trim(), 4);
      setWorkout(prev => ({
        ...prev,
        exercises: [...(prev.exercises || []), { id, grp: customExGroup, name: customExName.trim(), target_sets: 4, sets: [], volume: 0 }],
      }));
      setCustomExName('');
      setShowAddExercise(false);
    } catch (e) {
      showToast(e.message);
    } finally {
      setAddingEx(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden pb-28">
        <ScreenBg image="/workout-bg.jpg" overlay="bg-black/65" />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top overflow-y-auto">
          <HistoryDetailSkeleton />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <ErrorScreen
        overlay="bg-black/65"
        image="/workout-bg.jpg"
        onBack={goBack}
        onRetry={() => {
          setError(null);
          setLoading(true);
          api.getWorkout(workoutId).then(setWorkout).catch(e => { setError(e.message); showToast(e.message); }).finally(() => setLoading(false));
        }}
      />
    );
  }
  if (!workout) return null;

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden pb-28">
      <ScreenBg image="/workout-bg.jpg" overlay="bg-black/65" />

      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top overflow-y-auto">
        {/* Header */}
        <div className="pt-6 mb-5">
          <div className="font-sans text-white/35 text-sm mb-0.5">{formatDate(workout.date)}</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="font-bebas text-white" style={PAGE_HEADING_STYLE}>{fmtWorkoutType(workout.type)}</h1>
              {(workout.rating || editMode) && (
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(star => {
                    const rating = workout.rating || 0;
                    const filled = star <= rating;
                    const el = (
                      <span
                        key={star}
                        className={`text-lg ${editMode ? 'cursor-pointer active:scale-110 transition-transform' : ''}`}
                        style={{ color: filled ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)' }}
                        {...(editMode && {
                          onClick: async () => {
                            setSaving(true);
                            try {
                              await api.saveRating(workoutId, star);
                              setWorkout(prev => ({ ...prev, rating: star }));
                            } catch (e) {
                              showToast(e.message);
                            } finally {
                              setSaving(false);
                            }
                          },
                        })}
                      >
                        ★
                      </span>
                    );
                    return el;
                  })}
                </div>
              )}
            </div>
            {workout.type !== 'CARDIO' && (
              <button
                onClick={() => {
                  if (!editMode) {
                    setEditNote(workout.note || '');
                  } else if (editNote !== (workout.note || '')) {
                    api.updateNote(workoutId, editNote.trim()).then(() => {
                      setWorkout(prev => ({ ...prev, note: editNote.trim() || null }));
                    }).catch(e => showToast(e.message));
                  }
                  setEditMode(!editMode);
                }}
                className={`font-bebas tracking-wider text-sm px-3 py-1 rounded-lg transition-colors ${editMode ? 'bg-white/20 text-white' : 'text-white/50'}`}
              >
                {editMode ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
        </div>

        {/* Cardio */}
        {workout.type === 'CARDIO' && workout.cardio && (
          <div className="backdrop-blur-sm rounded-2xl p-4 mb-3" style={DARK_CARD_STYLE}>
            <div className="font-sans text-white/40 text-sm mb-1">Cardio</div>
            <p className="text-white/80 text-sm">{workout.cardio}</p>
          </div>
        )}

        {/* Exercises */}
        {workout.exercises?.map(ex => {
          const prevVolume = workout.prev_exercises?.[ex.name];
          const currentVolume = ex.volume || 0;
          const diff = prevVolume != null ? currentVolume - prevVolume : null;
          const diffPct = prevVolume > 0 ? Math.round((diff / prevVolume) * 100) : null;
          
          return (
          <div key={ex.id} className="backdrop-blur-sm rounded-2xl p-4 mb-3" style={DARK_CARD_STYLE}>
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
              </svg>
              <div className="flex-1">
                <div className="font-bebas tracking-wider text-base text-white">{ex.name}</div>
                <div className="text-xs text-white/30">{ex.grp}</div>
              </div>
              {diff !== null && diff !== 0 && (
                <div className="flex items-center gap-1 text-xs font-bebas tracking-wider text-white/70">
                  <span>{diff > 0 ? '↑' : '↓'}</span>
                  <span>{diffPct != null ? `${Math.abs(diffPct)}%` : ''}</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {ex.sets.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white/35 text-xs font-sans shrink-0 bg-white/10">
                    {i + 1}
                  </span>
                  {editMode && editingSet?.setId === s.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        value={editingSet.weight}
                        onChange={e => setEditingSet(prev => ({ ...prev, weight: e.target.value }))}
                        className="w-16 bg-white/10 rounded px-2 py-1 text-white text-sm text-center"
                        step="0.5"
                      />
                      <span className="text-white/40 text-sm">kg ×</span>
                      <input
                        type="number"
                        value={editingSet.reps}
                        onChange={e => setEditingSet(prev => ({ ...prev, reps: e.target.value }))}
                        className="w-14 bg-white/10 rounded px-2 py-1 text-white text-sm text-center"
                      />
                      <button
                        onClick={handleSaveSet}
                        disabled={saving}
                        className="text-white/90 text-sm font-bebas tracking-wider px-2 flex items-center gap-1"
                      >
                        {saving ? <Spinner size={14} /> : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => setEditingSet(null)}
                        className="text-white/40 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-white/70 font-sans text-sm flex-1">
                        {fmtW(s.weight)} kg × {s.reps} reps
                      </span>
                      {editMode && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditSet(ex.id, s)}
                            className="text-white/40 text-xs px-2 py-1"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteSet(ex.id, s.id)}
                            disabled={saving}
                            className="text-red-400/60 text-xs px-2 py-1 flex items-center"
                          >
                            {deletingSetId === s.id ? <Spinner size={12} /> : '✕'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {ex.sets.length === 0 && (
                <div className="text-white/30 text-sm">No sets recorded</div>
              )}
            </div>
          </div>
          );
        })}

        {/* Add Exercise (edit mode) */}
        {editMode && (
          <button
            onClick={() => setShowAddExercise(true)}
            className="card-press w-full rounded-2xl p-4 mb-3 flex items-center gap-3 transition-colors"
            style={SECONDARY_CARD_STYLE}
          >
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-lg shrink-0 bg-white/10">+</span>
            <div className="font-bebas tracking-wider text-base text-white">Add Exercise</div>
          </button>
        )}

        {/* Note */}
        {(workout.note || editMode) && (
          <div className="backdrop-blur-sm rounded-2xl p-4 mb-3" style={DARK_CARD_STYLE}>
            <div className="font-sans text-white/40 text-sm mb-1">Note</div>
            {editMode ? (
              <textarea
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
                placeholder="Add a note…"
                className="w-full appearance-none bg-black/30 rounded-xl p-3 text-white/80 placeholder-white/25 resize-none h-20 outline-none text-sm font-sans"
              />
            ) : (
              <p className="text-white/70 text-sm font-sans">{workout.note}</p>
            )}
          </div>
        )}
      </div>

      {/* Add Exercise modal */}
      {showAddExercise && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="modal-content mx-6 w-full max-w-sm bg-black/90 rounded-2xl p-6">
            <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-4">Add Exercise</h3>
            <div className="mb-4">
              <label className="text-xs text-white/40 mb-2 block font-bebas tracking-wider">Muscle Group</label>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map(grp => (
                  <button
                    key={grp}
                    onClick={() => setCustomExGroup(grp)}
                    className={`px-3 py-1.5 rounded-lg font-bebas tracking-wider text-sm transition-colors ${
                      customExGroup === grp
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-white/50'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="text-xs text-white/40 mb-2 block font-bebas tracking-wider">Exercise Name</label>
              <ExerciseNameInput
                value={customExName}
                onChange={setCustomExName}
                onSelectSuggestion={(item) => { setCustomExName(item.name); setCustomExGroup(item.grp); }}
                userId={workout?.user_id}
                placeholder="e.g. Dumbbell Curls"
                className="w-full appearance-none bg-black/50 rounded-xl px-3 py-3 text-white placeholder-white/25 outline-none font-bebas tracking-wider"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAddExercise}
                disabled={!customExName.trim() || addingEx}
                className="card-press w-full text-white/90 font-bebas tracking-wider text-base py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
                style={CARD_BTN_STYLE}
              >
                {addingEx ? (
                  <>
                    <Spinner size={18} />
                    Adding…
                  </>
                ) : (
                  'Add Exercise'
                )}
              </button>
              <button
                onClick={() => { setShowAddExercise(false); setCustomExName(''); }}
                className="w-full text-white/50 active:text-white/80 py-3 font-bebas tracking-wider text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 safe-bottom">
        {confirming ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="card-press w-full text-white/90 font-bebas tracking-wider text-lg py-4 rounded-2xl"
              style={CARD_BTN_STYLE}
            >
              Keep workout
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full text-white/40 active:text-white/70 disabled:opacity-40 py-3 font-bebas tracking-wider text-sm transition-colors flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <Spinner size={16} />
                  Deleting…
                </>
              ) : (
                'Yes, delete'
              )}
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
