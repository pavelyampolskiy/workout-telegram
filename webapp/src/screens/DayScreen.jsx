import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { ErrorScreen } from '../components/ErrorScreen';
import { Spinner } from '../components/Spinner';
import { DaySkeleton } from '../components/Skeleton';
import { ExerciseNameInput } from '../components/ExerciseNameInput';
import { CARD_BTN_STYLE, SECONDARY_CARD_STYLE, PAGE_HEADING_STYLE, fmtTime } from '../shared';
import { MUSCLE_GROUPS } from '../constants';
import { ConfirmModal } from '../components/ConfirmModal';

const ICON_WRAPPER = 'shrink-0 flex items-center justify-center text-white/50';

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
    <path d="M20.5 7.5L16 12l4.5 4.5M3.5 7.5L8 12l-4.5 4.5"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M3 6h18"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 5v14m-7-7h14"/>
  </svg>
);

export default function DayScreen() {
  const { params, userId, navigate, replace, resetTo, goBack, activeWorkout, setActiveWorkout, showToast } = useApp();
  const { day, dayLabel: paramLabel, isBackdated, dayProgram: passedDayProgram } = params;
  const dayLabel = paramLabel || day.replace('DAY_', 'Day ').replace(/^CUSTOM_\d+$/, 'Custom Workout');
  const isCardio = day && String(day).toUpperCase() === 'CARDIO';

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(3);
  const [saving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [durationMin, setDurationMin] = useState(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [customExName, setCustomExName] = useState('');
  const [customExGroup, setCustomExGroup] = useState('CHEST');
  const [customExercises, setCustomExercises] = useState([]);
  const [addingEx, setAddingEx] = useState(false);
  const [showNewExForm, setShowNewExForm] = useState(false);
  const [savingWorkout, setSavingWorkout] = useState(false); // for "Save Workout" → note screen
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [showCustomizeDay, setShowCustomizeDay] = useState(false);
  const [dayCustomizations, setDayCustomizations] = useState({ removed: [], added: [] });
  const [customizingDay, setCustomizingDay] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [removedExercises, setRemovedExercises] = useState([]); // Track removed exercises for current session
  const [pendingRemoval, setPendingRemoval] = useState(null); // Track exercise pending removal with countdown

  // Cardio is handled by CardioScreen only — redirect if we got here with day CARDIO
  useEffect(() => {
    if (isCardio) replace('cardio');
  }, [isCardio, replace]);

  if (isCardio) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
          <h1 className="font-bebas text-white pt-6 mb-5" style={PAGE_HEADING_STYLE}>Cardio</h1>
          <DaySkeleton />
        </div>
      </div>
    );
  }

  // exerciseMap: { [exIdx]: { dbId, setsCount } }
  const exerciseMap = activeWorkout?.exerciseMap || {};
  const workoutId = activeWorkout?.id;

  useEffect(() => {
    async function init() {
      try {
        // Если передана программа (из backdate), используем ее, иначе загружаем обычную
        let dayProgram = passedDayProgram;
        if (!dayProgram) {
          const prog = await api.getProgram(userId);
          dayProgram = prog[day] || [];
        }
        setProgram(dayProgram);

        if (!activeWorkout || activeWorkout.day !== day) {
          const { id } = await api.createWorkout(userId, day); // Без даты для обычных тренировок
          setActiveWorkout({ id, day, exerciseMap: {}, startedAt: Date.now() });
        } else if (activeWorkout && Object.keys(activeWorkout.exerciseMap || {}).length === 0) {
          // Resuming a workout — load existing exercises from backend
          const data = await api.getWorkout(activeWorkout.id);
          if (data.exercises?.length > 0) {
            const restoredMap = {};
            const restoredCustom = [];
            data.exercises.forEach(ex => {
              const progIdx = dayProgram?.findIndex(p => p.name === ex.name && p.group === ex.grp);
              if (progIdx >= 0) {
                restoredMap[progIdx] = { dbId: ex.id, setsCount: ex.sets?.length || 0 };
              } else {
                // Custom exercise
                restoredCustom.push({
                  id: ex.id,
                  group: ex.grp,
                  name: ex.name,
                  target_sets: ex.target_sets,
                  isCustom: true,
                });
                restoredMap[`custom_${ex.id}`] = { dbId: ex.id, setsCount: ex.sets?.length || 0 };
              }
            });
            setActiveWorkout(prev => ({ ...prev, exerciseMap: restoredMap }));
            
            // Load custom exercises from localStorage and merge with API data
            const savedCustom = localStorage.getItem(`customExercises_${activeWorkout.id}`);
            let allCustomExercises = restoredCustom;
            
            if (savedCustom) {
              try {
                const parsedCustom = JSON.parse(savedCustom);
                // Merge API custom exercises with localStorage exercises
                const mergedCustom = [...restoredCustom];
                parsedCustom.forEach(localEx => {
                  // Add local exercise if not already in API data and not removed
                  if (!mergedCustom.find(ex => ex.id === localEx.id) && !removedExercises.includes(localEx.name)) {
                    mergedCustom.push(localEx);
                    restoredMap[`custom_${localEx.id}`] = { dbId: localEx.id, setsCount: 0 };
                  }
                });
                allCustomExercises = mergedCustom;
                // Save merged data to localStorage
                localStorage.setItem(`customExercises_${workoutId}`, JSON.stringify(mergedCustom));
              } catch (e) {
                console.error('Error parsing custom exercises from localStorage:', e);
              }
            }
            
            setCustomExercises(allCustomExercises);
            setActiveWorkout(prev => ({ ...prev, exerciseMap: restoredMap }));
          } else {
            // Load custom exercises from localStorage if no exercises from API
            const savedCustom = localStorage.getItem(`customExercises_${activeWorkout.id}`);
            if (savedCustom) {
              try {
                const parsedCustom = JSON.parse(savedCustom);
                // Filter out removed custom exercises
                const filteredCustom = parsedCustom.filter(ex => !removedExercises.includes(ex.name));
                setCustomExercises(filteredCustom);
                // Add to exerciseMap
                const customMap = {};
                filteredCustom.forEach(ex => {
                  customMap[`custom_${ex.id}`] = { dbId: ex.id, setsCount: 0 };
                });
                setActiveWorkout(prev => ({ 
                  ...prev, 
                  exerciseMap: { ...prev.exerciseMap, ...customMap }
                }));
              } catch (e) {
                console.error('Error parsing custom exercises from localStorage:', e);
              }
            }
          }
        }
      } catch (e) {
        setError(e.message);
        showToast(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [userId, day, passedDayProgram]);

  // Workout duration timer — updates every second (keeps counting when app is closed)
  useEffect(() => {
    const startedAt = activeWorkout?.startedAt;
    if (!startedAt) {
      setElapsedSec(0);
      return;
    }
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout?.startedAt]);

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

  const handleSaveWorkout = async () => {
    const mins = activeWorkout?.startedAt
      ? Math.round((Date.now() - activeWorkout.startedAt) / 60000)
      : null;
    setDurationMin(mins);
    setSavingWorkout(true);
    try {
      const completionDate = activeWorkout?.isBackdated 
        ? activeWorkout.backdateDate 
        : undefined;
      
      await api.finishWorkout(workoutId, completionDate);
      // Clear active workout from localStorage when finishing
      localStorage.removeItem(`activeWorkout_${userId}`);
      // Clear custom exercises from localStorage when finishing
      localStorage.removeItem(`customExercises_${workoutId}`);
      localStorage.removeItem(`removedExercises_${workoutId}`);
      setShowNote(true);
    } catch (e) {
      showToast(e.message);
    }
    setSavingWorkout(false);
  };

  const handleDone = async () => {
    setSavingWorkout(true);
    try {
      // Save note and rating if provided
      if (note.trim() || rating !== 3) {
        if (note.trim()) {
          await api.addNote(workoutId, note);
        }
        if (rating !== 3) {
          await api.saveRating(workoutId, rating);
        }
      }
      
      // Go to home screen
      resetTo('home');
    } catch (e) {
      showToast(e.message);
    }
    setSavingWorkout(false);
  };

  const loadAvailableExercises = async () => {
    if (!userId) return;

    setLoadingExercises(true);
    try {
      const programData = await api.getProgram(userId);
      const exercises = [];
      const seen = new Set();

      const allDays = Object.keys(programData).filter(key =>
        key.startsWith('DAY_') || key.startsWith('CUSTOM_') || key.includes('DAY')
      );

      for (const d of allDays) {
        for (const ex of (programData[d] || [])) {
          if (!seen.has(ex.name)) {
            seen.add(ex.name);
            exercises.push({ ...ex, fromDay: d });
          }
        }
      }

      // Filter out exercises already in the current workout (program + custom added)
      const currentNames = new Set([
        ...(program?.filter((_, i) => !removedExercises.includes(i)).map(ex => ex.name) || []),
        ...customExercises.map(ex => ex.name),
      ]);
      const available = exercises.filter(ex => !currentNames.has(ex.name));

      setAvailableExercises(available);
    } catch (e) {
      setAvailableExercises([]);
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleSelectExistingExercise = async (exercise) => {
    if (!workoutId) return;
    
    try {
      const { id } = await api.createExercise(workoutId, exercise.group, exercise.name, exercise.target_sets || 3);
      
      const newExercise = {
        id,
        group: exercise.group,
        name: exercise.name,
        target_sets: exercise.target_sets || 3,
        isCustom: true,
        sets: []
      };
      
      setActiveWorkout(prev => ({
        ...prev,
        exercises: [...(prev.exercises || []), newExercise],
        exerciseMap: { ...prev.exerciseMap, [`custom_${id}`]: { dbId: id, setsCount: 0 } },
      }));
      
      setShowAddExercise(false);
      setAvailableExercises([]);
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleAddExerciseClick = () => {
    setShowAddExercise(true);
    loadAvailableExercises();
  };

  const handleCancel = async () => {
    if (workoutId) {
      api.deleteWorkout(workoutId).catch(e => showToast(e.message));
    }
    resetTo('home');
  };

  const handleAddCustomExercise = async () => {
    if (!customExName.trim() || !workoutId) return;
    setAddingEx(true);
    try {
      const { id } = await api.createExercise(workoutId, customExGroup, customExName.trim(), 4);
      const newEx = {
        id,
        group: customExGroup,
        name: customExName.trim(),
        target_sets: 4,
        isCustom: true,
      };
      setCustomExercises(prev => [...prev, newEx]);
      // Save custom exercises to localStorage for persistence
      try {
        localStorage.setItem(`customExercises_${workoutId}`, JSON.stringify([...customExercises, newEx]));
      } catch (e) {
        console.error('Failed to save custom exercises to localStorage:', e);
        showToast('Warning: Exercise saved locally, but storage may be full');
      }
      setActiveWorkout(prev => ({
        ...prev,
        exerciseMap: { ...prev.exerciseMap, [`custom_${id}`]: { dbId: id, setsCount: 0 } },
      }));
      setCustomExName('');
      setShowAddExercise(false);
      setShowNewExForm(false);
    } catch (e) {
      showToast(e.message);
    } finally {
      setAddingEx(false);
    }
  };

  const handleCustomExerciseTap = (ex) => {
    navigate('exercise', {
      exIdx: `custom_${ex.id}`,
      exDbId: ex.id,
      workoutId,
      day,
      userId,
      customEx: ex,
    });
  };

  const handleRemoveExercise = (exerciseName) => {
  // Start countdown for removal
  setPendingRemoval({
    name: exerciseName,
    type: 'program',
    countdown: 3
  });
  
  // Start countdown timer
  const timer = setInterval(() => {
    setPendingRemoval(prev => {
      if (!prev) return null;
      
      if (prev.countdown <= 1) {
        // Execute removal
        executeRemoval(prev);
        clearInterval(timer);
        return null;
      }
      
      return { ...prev, countdown: prev.countdown - 1 };
    });
  }, 1000);
  
  // Store timer ID for cleanup
  setPendingRemoval(prev => prev ? { ...prev, timerId: timer } : null);
};

const handleRemoveCustomExercise = (exerciseId) => {
  const customExercise = customExercises.find(ex => ex.id === exerciseId);
  if (!customExercise) return;
  
  // Start countdown for removal
  setPendingRemoval({
    name: customExercise.name,
    id: exerciseId,
    type: 'custom',
    countdown: 3
  });
  
  // Start countdown timer
  const timer = setInterval(() => {
    setPendingRemoval(prev => {
      if (!prev) return null;
      
      if (prev.countdown <= 1) {
        // Execute removal
        executeRemoval(prev);
        clearInterval(timer);
        return null;
      }
      
      return { ...prev, countdown: prev.countdown - 1 };
    });
  }, 1000);
  
  // Store timer ID for cleanup
  setPendingRemoval(prev => prev ? { ...prev, timerId: timer } : null);
};

const executeRemoval = (removal) => {
  if (removal.type === 'program') {
    // Add to removed exercises list and save to localStorage
    if (!removedExercises.includes(removal.name)) {
      const newRemoved = [...removedExercises, removal.name];
      setRemovedExercises(newRemoved);
      
      // Save to localStorage for persistence
      localStorage.setItem(`removedExercises_${workoutId}`, JSON.stringify(newRemoved));
      
      // Save to activeWorkout for persistence
      setActiveWorkout(prev => ({ 
        ...prev, 
        removedExercises: newRemoved,
        exerciseMap: { ...prev.exerciseMap }
      }));
      
      // Remove from exerciseMap
      const exerciseIndex = program.findIndex(ex => ex.name === removal.name);
      if (exerciseIndex >= 0) {
        setActiveWorkout(prev => {
          const newMap = { ...prev.exerciseMap };
          delete newMap[exerciseIndex];
          return { ...prev, exerciseMap: newMap };
        });
      }
    }
  } else if (removal.type === 'custom') {
    // Remove custom exercise
    const newRemoved = [...removedExercises, removal.name];
    setRemovedExercises(newRemoved);
    
    // Save to localStorage for persistence
    localStorage.setItem(`removedExercises_${workoutId}`, JSON.stringify(newRemoved));
    
    // Save to activeWorkout for persistence
    setActiveWorkout(prev => ({ 
      ...prev, 
      removedExercises: newRemoved,
      exerciseMap: { ...prev.exerciseMap }
    }));
    
    setCustomExercises(prev => {
      const updated = prev.filter(ex => ex.id !== removal.id);
      // Save updated custom exercises to localStorage
      localStorage.setItem(`customExercises_${workoutId}`, JSON.stringify(updated));
      return updated;
    });
    
    // Remove from exerciseMap
    setActiveWorkout(prev => {
      const newMap = { ...prev.exerciseMap };
      delete newMap[`custom_${removal.id}`];
      return { ...prev, exerciseMap: newMap };
    });
  }
};

const cancelRemoval = () => {
  if (pendingRemoval?.timerId) {
    clearInterval(pendingRemoval.timerId);
  }
  setPendingRemoval(null);
};

  const handleSaveCustomizations = async () => {
    setCustomizingDay(true);
    try {
      await api.saveDayCustomizations(day, userId, dayCustomizations.removed, dayCustomizations.added);
      showToast('Day customizations saved!');
      setShowCustomizeDay(false);
      // Reload the program with customizations
      const data = await api.getCustomizedProgram(day, userId);
      if (data.has_customizations) {
        // Update the program with customizations
        // This would require updating the program state
        console.log('Customizations applied:', data.exercises);
      }
    } catch (e) {
      showToast(e.message);
    } finally {
      setCustomizingDay(false);
    }
  };

  // Load removed exercises from localStorage or activeWorkout
  useEffect(() => {
    if (activeWorkout?.removedExercises) {
      setRemovedExercises(activeWorkout.removedExercises);
    } else if (workoutId) {
      const saved = localStorage.getItem(`removedExercises_${workoutId}`);
      if (saved) {
        try {
          setRemovedExercises(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse removed exercises:', e);
        }
      }
    }
  }, [activeWorkout, workoutId]);

  // Single useEffect for custom exercises management
  useEffect(() => {
    if (!workoutId) return;
    
    console.log('Custom exercises management triggered:', { 
      removedExercises, 
      customExercises: customExercises.map(ex => ex.name),
      workoutId 
    });
    
    // Load from localStorage if not loaded yet
    if (customExercises.length === 0) {
      const savedCustom = localStorage.getItem(`customExercises_${workoutId}`);
      console.log('Loading custom exercises from localStorage:', { workoutId, savedCustom });
      
      if (savedCustom) {
        try {
          const parsedCustom = JSON.parse(savedCustom);
          console.log('Parsed custom exercises:', parsedCustom);
          
          // Filter out removed exercises
          const filteredCustom = parsedCustom.filter(ex => !removedExercises.includes(ex.name));
          setCustomExercises(filteredCustom);
          
          // Add to exerciseMap
          const customMap = {};
          filteredCustom.forEach(ex => {
            customMap[`custom_${ex.id}`] = { dbId: ex.id, setsCount: 0 };
          });
          
          setActiveWorkout(prev => ({ 
            ...prev, 
            exerciseMap: { ...prev.exerciseMap, ...customMap }
          }));
        } catch (e) {
          console.error('Error parsing custom exercises from localStorage:', e);
        }
      }
    }
    
    // Filter out removed exercises if they exist
    if (removedExercises.length > 0 && customExercises.length > 0) {
      const filteredCustom = customExercises.filter(ex => !removedExercises.includes(ex.name));
      if (filteredCustom.length !== customExercises.length) {
        console.log('Filtering custom exercises:', {
          before: customExercises.map(ex => ex.name),
          after: filteredCustom.map(ex => ex.name),
          removed: removedExercises
        });
        setCustomExercises(filteredCustom);
        localStorage.setItem(`customExercises_${workoutId}`, JSON.stringify(filteredCustom));
        
        // Update exerciseMap to remove removed custom exercises
        setActiveWorkout(prev => {
          const newMap = { ...prev.exerciseMap };
          customExercises.forEach(ex => {
            if (removedExercises.includes(ex.name)) {
              delete newMap[`custom_${ex.id}`];
            }
          });
          return { ...prev, exerciseMap: newMap };
        });
      }
    }
    
    // Always save current state to localStorage
    if (customExercises.length > 0) {
      localStorage.setItem(`customExercises_${workoutId}`, JSON.stringify(customExercises));
    }
  }, [workoutId, removedExercises]);

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
          <h1 className="font-bebas text-white pt-6 mb-5" style={PAGE_HEADING_STYLE}>{dayLabel || 'Workout'}</h1>
          <DaySkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorScreen
        overlay="bg-black/65"
        image="/gym-bg.jpg"
        onBack={goBack}
        onRetry={() => { setError(null); setLoading(true); setRetryTrigger(t => t + 1); }}
      />
    );
  }

  if (showNote) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto pb-36">
          <h1 className="font-bebas text-white pt-6 mb-2" style={PAGE_HEADING_STYLE}>Workout saved!</h1>
          {durationMin !== null && durationMin > 0 && (
            <p className="text-white/55 text-sm mb-5 font-bebas tracking-wider">{durationMin} min</p>
          )}

          {/* Star rating */}
          <div className="mb-5">
            <p className="font-sans text-white/60 text-xs mb-3">How was your workout?</p>
            <div className="flex justify-start gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="text-3xl transition-transform active:scale-110"
                  style={{ color: star <= rating ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)' }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <p className="font-sans text-white/45 text-xs mb-2">Add a note (optional)</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="E.g. Felt strong today…"
            className="w-full appearance-none bg-black/50 rounded-xl p-3 text-white placeholder-white/25 resize-none h-28 outline-none mt-4 text-sm font-sans"
          />
        </div>

        {/* Кнопки прикреплены к нижнему краю */}
        <div className="fixed bottom-0 left-0 right-0 z-20 p-5 safe-bottom max-w-lg mx-auto bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-8">
          <button
            onClick={handleDone}
            disabled={savingWorkout}
            className="btn-active-style card-press w-full text-white/92 font-bebas tracking-wider text-lg py-4 rounded-[14px] disabled:opacity-50"
          >
            {savingWorkout ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Spinner size={20} />
                Saving…
              </span>
            ) : (
              'Done'
            )}
          </button>
          <button
            onClick={() => resetTo('home')}
            className="w-full mt-1 text-white/40 py-1 font-bebas tracking-wider text-sm"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden pb-32">
      <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-5 safe-top-lg flex-shrink-0">
        <h1 className="font-bebas text-white shrink-0" style={PAGE_HEADING_STYLE}>{dayLabel}</h1>
        {activeWorkout?.startedAt != null && (
          <span className="font-bebas tracking-widest text-white/60 tabular-nums" style={PAGE_HEADING_STYLE}>{fmtTime(elapsedSec)}</span>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-2 pb-28">
        {program?.map((ex, idx) => {
          // Skip if exercise is in removed list
          if (removedExercises.includes(ex.name)) return null;
          
          const info = exerciseMap[idx];
          const done = info?.setsCount || 0;
          const total = ex.target_sets;
          const complete = done >= total;

          return (
            <div
              key={idx}
              className={`card-press w-full rounded-2xl p-4 text-left flex items-start gap-3 transition-colors relative ${editMode ? 'edit-mode' : ''}`}
              style={{ ...CARD_BTN_STYLE, ...(complete && { background: 'rgba(255,255,255,0.12)' }) }}
              onClick={() => !editMode && handleExerciseTap(idx)}
            >
              <span className="text-white/40 text-xs font-bebas tracking-wider shrink-0 pt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`font-bebas tracking-wider text-base leading-tight ${complete ? 'text-white' : 'text-white/80'}`}>
                  {ex.name}
                </div>
                <div className="text-white/30 text-xs mt-1">{ex.group}</div>
                {/* Progress bar - hide in edit mode */}
                {!editMode && done > 0 && (
                  <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden w-full">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ease-out ${complete ? 'bg-white/80' : 'bg-white/60'}`}
                      style={{ width: `${Math.min((done / total) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                {editMode && (
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {pendingRemoval && pendingRemoval.name === ex.name && pendingRemoval.type === 'program' ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-red-400 text-xs font-bebas">
                          {pendingRemoval.countdown}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            cancelRemoval();
                          }}
                          className="text-white/60 text-xs font-bebas px-2 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors"
                        >
                          Don't remove
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log('Remove clicked:', ex.name);
                          handleRemoveExercise(ex.name);
                        }}
                        className="text-red-400 text-sm font-bebas px-3 py-1 bg-red-500/30 rounded hover:bg-red-500/40 transition-colors shrink-0 remove-button-pulse"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
                {!editMode && done > 0 && (
                  <span className={`text-sm font-bebas tracking-wider ${complete ? 'text-white/70' : 'text-white/40'}`}>
                    {done}/{total}
                  </span>
                )}
                {!editMode && !done && (
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-sm font-bebas tracking-wider text-white/70">{total}</span>
                    <span className="text-[9px] uppercase tracking-wider text-white/35 mt-0.5">sets</span>
                  </div>
                )}
                {complete && !editMode && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white/70 shrink-0">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}

        {/* Custom exercises */}
        {customExercises.map((ex) => {
          const info = exerciseMap[`custom_${ex.id}`];
          const done = info?.setsCount || 0;
          const total = ex.target_sets;
          const complete = done >= total;

          return (
            <div
              key={`custom_${ex.id}`}
              className={`card-press w-full rounded-2xl p-4 text-left flex items-start gap-3 transition-colors relative ${editMode ? 'edit-mode' : ''}`}
              style={{ ...CARD_BTN_STYLE, ...(complete && { background: 'rgba(255,255,255,0.12)' }) }}
              onClick={() => !editMode && handleCustomExerciseTap(ex)}
            >
              <span className="text-white/40 text-xs font-bebas tracking-wider shrink-0 pt-0.5">
                C
              </span>
              <div className="flex-1 min-w-0">
                <div className={`font-bebas tracking-wider text-base leading-tight ${complete ? 'text-white' : 'text-white/80'}`}>
                  {ex.name}
                </div>
                <div className="text-white/30 text-xs mt-1">{ex.group}</div>
                {/* Progress bar - hide in edit mode */}
                {!editMode && done > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                      <span>Progress</span>
                      <span>{done}/{total}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div 
                        className="bg-white/60 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${(done / total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {!editMode && total > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bebas tracking-wider text-white/70">{total}</span>
                    <span className="text-[9px] uppercase tracking-wider text-white/35 mt-0.5">sets</span>
                  </div>
                )}
                {editMode && (
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {pendingRemoval && pendingRemoval.id === ex.id && pendingRemoval.type === 'custom' ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-red-400 text-xs font-bebas">
                          {pendingRemoval.countdown}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            cancelRemoval();
                          }}
                          className="text-white/60 text-xs font-bebas px-2 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors"
                        >
                          Don't remove
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log('Remove custom clicked:', ex.name);
                          handleRemoveCustomExercise(ex.id);
                        }}
                        className="text-red-400 text-sm font-bebas px-3 py-1 bg-red-500/30 rounded hover:bg-red-500/40 transition-colors shrink-0 remove-button-pulse"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
                {complete && !editMode && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white/70 shrink-0">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}

        {/* Separator with Modify current workout */}
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="text-white/40 text-xs font-bebas tracking-wider">Modify current workout</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        {/* Exercise buttons in one row */}
        <div className="flex gap-2">
          {/* Delete Exercise button */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`card-press flex-1 rounded-2xl p-4 text-left flex items-center gap-3 transition-colors ${editMode ? 'done-button-active' : ''}`}
            style={SECONDARY_CARD_STYLE}
          >
            <span className={ICON_WRAPPER}>
              {editMode ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M20 6L9 17l-5-5"/>
              </svg> : <TrashIcon />}
            </span>
            <div className={`font-bebas tracking-wider text-base ${editMode ? 'text-white' : 'text-white/70'}`}>
              {editMode ? 'Done' : 'Delete Exercise'}
            </div>
          </button>

          {/* Add Exercise button */}
          <button
            onClick={handleAddExerciseClick}
            disabled={editMode}
            className={`card-press flex-1 rounded-2xl p-4 text-left flex items-center gap-3 transition-colors ${editMode ? 'save-workout-disabled' : ''}`}
            style={SECONDARY_CARD_STYLE}
          >
            <span className={ICON_WRAPPER}>
              <PlusIcon />
            </span>
            <div className="font-bebas tracking-wider text-base text-white/70">
              Add Exercise
            </div>
          </button>
        </div>
      </div>

      {/* Fixed bottom: только кнопка, без чёрного поля — контент уезжает под кнопку */}
      {!showAddExercise && createPortal(
        <div
          className="fixed bottom-0 left-0 right-0 z-[100] max-w-lg mx-auto px-4 pt-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={handleSaveWorkout}
            disabled={savingWorkout || editMode}
            className={`btn-active-style card-press w-full text-white/92 font-bebas tracking-wider text-lg py-4 rounded-[14px] disabled:opacity-50 flex items-center justify-center gap-2 ${editMode ? 'save-workout-disabled' : ''}`}
          >
            {savingWorkout ? (
              <>
                <Spinner size={20} />
                Saving…
              </>
            ) : (
              'Save Workout'
            )}
          </button>
          <button
            onClick={() => !editMode && setShowCancelConfirm(true)}
            disabled={editMode}
            className={`w-full text-center font-bebas text-white/50 py-3 transition-colors text-lg ${editMode ? 'save-workout-disabled' : ''}`}
            style={{ letterSpacing: '0.05em' }}
          >
            Cancel workout
          </button>
        </div>,
        document.body
      )}

      <ConfirmModal
        visible={showCancelConfirm}
        title="Cancel workout?"
        description="All progress will be lost."
        primaryLabel="Keep working"
        primaryOnClick={() => setShowCancelConfirm(false)}
        secondaryLabel="Cancel workout"
        secondaryOnClick={handleCancel}
      />

      {/* Add Exercise modal */}
      {showAddExercise && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="modal-content mx-6 w-full max-w-sm bg-black/90 rounded-2xl p-6 max-h-[80vh] flex flex-col">
            <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-4">Add Exercise</h3>

            {!showNewExForm ? (
              <>
                <div className="flex-1 overflow-y-auto space-y-1 mb-4">
                  {loadingExercises ? (
                    <div className="text-center text-white/40 py-4">Loading...</div>
                  ) : availableExercises.length > 0 ? (
                    Object.entries(
                      availableExercises.reduce((acc, ex) => {
                        const d = (ex.fromDay || '').replace('DAY_', 'Day ').replace(/_/g, ' ');
                        (acc[d] = acc[d] || []).push(ex);
                        return acc;
                      }, {})
                    ).map(([dayName, exs]) => (
                      <div key={dayName}>
                        <div className="text-xs text-white/30 font-bebas tracking-wider mt-3 mb-1 px-1">{dayName}</div>
                        {exs.map((exercise, index) => (
                          <button
                            key={index}
                            onClick={() => handleSelectExistingExercise(exercise)}
                            className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors mb-1"
                          >
                            <div className="font-bebas text-sm text-white/90">{exercise.name}</div>
                            <div className="text-xs text-white/40">{exercise.group}</div>
                          </button>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-white/40 py-4">All exercises already added</div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <button
                    onClick={() => setShowNewExForm(true)}
                    className="w-full card-press py-3 rounded-xl text-white/90 font-bebas tracking-wider flex items-center justify-center gap-2"
                    style={CARD_BTN_STYLE}
                  >
                    <PlusIcon /> Create New Exercise
                  </button>
                  <button
                    onClick={() => { setShowAddExercise(false); setAvailableExercises([]); setShowNewExForm(false); }}
                    className="w-full text-white/50 py-3 font-bebas tracking-wider text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-4">
                  <div>
                    <label className="text-xs text-white/40 font-bebas tracking-wider mb-1 block">Exercise Name</label>
                    <input
                      type="text"
                      value={customExName}
                      onChange={e => setCustomExName(e.target.value)}
                      placeholder="e.g. Bulgarian Split Squat"
                      className="w-full bg-white/5 rounded-xl px-4 py-3 text-white/90 text-sm font-bebas tracking-wider placeholder:text-white/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 font-bebas tracking-wider mb-2 block">Muscle Group</label>
                    <div className="grid grid-cols-2 gap-2">
                      {MUSCLE_GROUPS.map(g => (
                        <button
                          key={g}
                          onClick={() => setCustomExGroup(g)}
                          className={`py-2.5 rounded-xl font-bebas text-sm tracking-wider transition-colors ${
                            customExGroup === g
                              ? 'bg-white/20 text-white'
                              : 'bg-white/5 text-white/50'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
                  <button
                    onClick={handleAddCustomExercise}
                    disabled={!customExName.trim() || addingEx}
                    className="w-full card-press py-3 rounded-xl text-white/90 font-bebas tracking-wider disabled:opacity-30"
                    style={CARD_BTN_STYLE}
                  >
                    {addingEx ? 'Adding...' : `Add — ${customExGroup}`}
                  </button>
                  <button
                    onClick={() => { setShowNewExForm(false); setCustomExName(''); }}
                    className="w-full text-white/50 py-3 font-bebas tracking-wider text-sm"
                  >
                    Back to list
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// Add CSS for edit mode and Done button animation
const style = document.createElement('style');
style.textContent = `
  .edit-mode {
    position: relative;
  }
  
  .done-button-active {
    background: rgba(255, 255, 255, 0.06) !important;
  }

  .remove-button-pulse {
    background: rgba(255, 255, 255, 0.06) !important;
  }
  
  .save-workout-disabled {
    opacity: 0.3 !important;
    pointer-events: none !important;
  }
`;
if (!document.head.querySelector('style[data-day-screen]')) {
  style.setAttribute('data-day-screen', 'true');
  document.head.appendChild(style);
}
