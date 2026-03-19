import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE, DARK_CARD_STYLE, PAGE_HEADING_STYLE, formatDate } from '../shared';
import { WorkoutSkeleton } from '../components/Skeleton';
import { ConfirmModal } from '../components/ConfirmModal';
import { CardioIcon } from '../components/Icons';

function formatActiveDayLabel(dayKey, days) {
  if (!dayKey) return 'Workout';
  const d = days?.find(x => x.key === dayKey);
  if (d) return d.label;
  if (dayKey === 'CARDIO') return 'Cardio';
  return dayKey.replace('DAY_', 'Day ').replace(/^CUSTOM_\d+$/, 'Custom');
}

const DayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

const RepeatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M1 4v6h6M23 20v-6h-6"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
);

function DayCard({ day, onPress, lastWorkout }) {
  return (
    <button
      onClick={onPress}
      className="btn-active-style card-press w-full rounded-[14px] p-4 text-left flex items-center gap-4"
    >
      <span className="shrink-0 flex items-center justify-center text-white">
        <DayIcon />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-bebas tracking-wider text-lg text-white">{day.label}</div>
        {lastWorkout && (
          <div className="text-xs text-white/40 mt-1">
            Last: {formatDate(lastWorkout.date.split('T')[0])}
          </div>
        )}
      </div>
    </button>
  );
}

function WorkoutHistoryCard({ workout, onPress }) {
  return (
    <button
      onClick={onPress}
      className="btn-active-style card-press w-full rounded-[14px] p-3 text-left flex items-center gap-3"
    >
      <span className="shrink-0 flex items-center justify-center text-white/60">
        <RepeatIcon />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-bebas tracking-wider text-sm text-white/80">
          {formatDate(workout.date.split('T')[0])}
        </div>
        <div className="text-xs text-white/40">
          {workout.type} • {workout.exercise_count} exercises
        </div>
      </div>
    </button>
  );
}

export default function RepeatWorkoutScreen() {
  const { navigate, userId, showToast, activeWorkout, setActiveWorkout } = useApp();
  const [days, setDays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkoutType, setSelectedWorkoutType] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    api.getDays(userId)
      .then(setDays)
      .catch(e => showToast(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleWorkoutTypeSelect = async (type, params) => {
    setSelectedWorkoutType({ type, params });
    
    // Загружаем историю тренировок этого типа
    setHistoryLoading(true);
    try {
      const history = await api.getHistory(userId, 0, 20, type);
      setWorkoutHistory(history.items || []);
    } catch (e) {
      showToast(e.message);
      setWorkoutHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRepeatWorkout = async (workoutToRepeat) => {
    try {
      // Создаем новую тренировку с датой = сегодня
      const today = new Date().toISOString().split('T')[0];
      const { id } = await api.createWorkout(userId, workoutToRepeat.type);
      
      // Устанавливаем активную тренировку с флагом repeat
      setActiveWorkout({ 
        id, 
        day: workoutToRepeat.type, 
        exerciseMap: {}, 
        startedAt: Date.now(),
        isRepeat: true,
        repeatFromWorkout: workoutToRepeat
      });
      
      // Переходим к экрану тренировки
      const label = formatActiveDayLabel(workoutToRepeat.type, days);
      if (workoutToRepeat.type === 'CARDIO') {
        navigate('cardio');
      } else {
        navigate('day', { 
          day: workoutToRepeat.type, 
          dayLabel: label, 
          isRepeat: true,
          repeatFromWorkout: workoutToRepeat
        });
      }
    } catch (e) {
      showToast(e.message);
    }
  };

  const getLastWorkout = (type) => {
    return workoutHistory.find(w => w.type === type);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
        <div className="relative z-10 flex flex-col flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
          <h1 className="font-bebas text-white pt-6 mb-5" style={PAGE_HEADING_STYLE}>Repeat Previous Workout</h1>
          <WorkoutSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
        <div className="pt-6 pb-6 safe-bottom shrink-0">
          {/* Заголовок */}
          <div className="rounded-xl p-4 space-y-4" style={DARK_CARD_STYLE}>
            <h1 className="font-bebas text-white mb-1" style={PAGE_HEADING_STYLE}>Repeat Previous Workout</h1>
            <p className="text-white/40 text-sm">Select a workout type and choose a previous workout to repeat with the same weights</p>
          </div>

          {/* Выбор типа тренировки */}
          <div className="rounded-xl p-4 space-y-3" style={DARK_CARD_STYLE}>
            <div className="font-bebas tracking-wider text-lg text-white">Workout Type</div>
            <div className="space-y-2">
              {days?.map(day => (
                <DayCard
                  key={day.id}
                  day={day}
                  lastWorkout={getLastWorkout(day.key)}
                  onPress={() => handleWorkoutTypeSelect(day.key, { day: day.key, dayLabel: day.label })}
                />
              ))}
            </div>
            
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[9px] uppercase tracking-widest text-white/25 font-sans">or</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            
            <button
              onClick={() => handleWorkoutTypeSelect('CARDIO', {})}
              className="btn-active-style card-press w-full rounded-[14px] p-4 text-left flex items-center gap-4"
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color: 'rgba(255,255,255,0.82)' }}>
                <CardioIcon />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bebas tracking-wider text-lg text-white">Cardio</div>
                {getLastWorkout('CARDIO') && (
                  <div className="text-xs text-white/40 mt-1">
                    Last: {formatDate(getLastWorkout('CARDIO').date.split('T')[0])}
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* История тренировок выбранного типа */}
          {selectedWorkoutType && (
            <div className="rounded-xl p-4 space-y-3" style={DARK_CARD_STYLE}>
              <div className="font-bebas tracking-wider text-lg text-white">
                Previous {formatActiveDayLabel(selectedWorkoutType.type, days)} Workouts
              </div>
              
              {historyLoading ? (
                <div className="text-center py-4">
                  <div className="text-white/40 text-sm">Loading workout history...</div>
                </div>
              ) : workoutHistory.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {workoutHistory.map(workout => (
                    <WorkoutHistoryCard
                      key={workout.id}
                      workout={workout}
                      onPress={() => handleRepeatWorkout(workout)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-white/40 text-sm">No previous workouts found</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
