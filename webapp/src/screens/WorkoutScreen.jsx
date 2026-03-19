import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE, DARK_CARD_STYLE, PAGE_HEADING_STYLE } from '../shared';
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

const RepeatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M1 4v6h6M23 20v-6h-6"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const DayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

function DayCard({ day, onPress }) {
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
      </div>
    </button>
  );
}

export default function WorkoutScreen() {
  const { navigate, startWorkoutCountdown, userId, showToast, activeWorkout, setActiveWorkout } = useApp();
  const [days, setDays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkoutModal, setActiveWorkoutModal] = useState(null); // { screen, params }
  const [switchingWorkout, setSwitchingWorkout] = useState(false);

  const handleDayOrCardioPress = (targetScreen, targetParams) => {
    const isCardio = targetScreen === 'cardio' || (targetParams?.day != null && String(targetParams.day).toUpperCase() === 'CARDIO');
    if (isCardio) {
      if (!activeWorkout) {
        navigate('cardio');
        return;
      }
      if (activeWorkout.day === 'CARDIO') {
        navigate('cardio');
        return;
      }
      setActiveWorkoutModal({ screen: 'cardio', params: {} });
      return;
    }
    if (!activeWorkout) {
      startWorkoutCountdown('day', targetParams);
      return;
    }
    const currentDay = activeWorkout.day;
    if (targetParams?.day === currentDay) {
      navigate('day', targetParams);
      return;
    }
    setActiveWorkoutModal({ screen: targetScreen, params: targetParams || {} });
  };

  const handleContinueCurrent = () => {
    if (!activeWorkout) return;
    const label = formatActiveDayLabel(activeWorkout.day, days);
    if (activeWorkout.day === 'CARDIO') {
      navigate('cardio');
    } else {
      navigate('day', { day: activeWorkout.day, dayLabel: label });
    }
    setActiveWorkoutModal(null);
  };

  const handleStartNew = async () => {
    if (!activeWorkout || !activeWorkoutModal) return;
    setSwitchingWorkout(true);
    try {
      await api.deleteWorkout(activeWorkout.id);
      setActiveWorkout(null);
      setActiveWorkoutModal(null);
      if (activeWorkoutModal.screen === 'day') {
        startWorkoutCountdown('day', activeWorkoutModal.params);
      } else {
        navigate('cardio');
      }
    } catch (e) {
      showToast(e.message);
    } finally {
      setSwitchingWorkout(false);
    }
  };

  useEffect(() => {
    api.getDays(userId)
      .then(setDays)
      .catch(e => showToast(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
        <div className="pt-6 pb-6 safe-bottom shrink-0">
          {loading ? (
            <WorkoutSkeleton />
          ) : (
            <>
              {/* Всё в одной плашке: заголовок + Day A/B/C + or + Cardio */}
              <div className="rounded-xl p-4 space-y-3" style={DARK_CARD_STYLE}>
                <h1 className="font-bebas text-white mb-1" style={PAGE_HEADING_STYLE}>New Workout</h1>
                <div className="space-y-2">
                  {days?.map(day => (
                    <DayCard
                      key={day.id}
                      day={day}
                      onPress={() => (String(day.key).toUpperCase() === 'CARDIO' ? navigate('cardio') : handleDayOrCardioPress('day', { day: day.key, dayLabel: day.label }))}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-[9px] uppercase tracking-widest text-white/25 font-sans">or</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
                <button
                  onClick={() => handleDayOrCardioPress('cardio')}
                  className="btn-active-style card-press w-full rounded-[14px] p-4 text-left flex items-center gap-4"
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color: 'rgba(255,255,255,0.82)' }}>
                    <CardioIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bebas tracking-wider text-lg text-white">Cardio</div>
                  </div>
                </button>

                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-[9px] uppercase tracking-widest text-white/25 font-sans">or</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                <button
                  onClick={() => navigate('backdate-workout')}
                  className="btn-active-style card-press w-full rounded-[14px] p-4 text-left flex items-center gap-4"
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white/60">
                    <CalendarIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bebas tracking-wider text-lg text-white/60">Add Past Workout</div>
                    <div className="text-xs text-white/40">Record a workout from a previous date</div>
                  </div>
                </button>

                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-[9px] uppercase tracking-widest text-white/25 font-sans">or</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                <button
                  onClick={() => navigate('repeat-workout')}
                  className="btn-active-style card-press w-full rounded-[14px] p-4 text-left flex items-center gap-4"
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white/60">
                    <RepeatIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bebas tracking-wider text-lg text-white/60">Repeat Previous Workout</div>
                    <div className="text-xs text-white/40">Use weights from a previous workout</div>
                  </div>
                </button>
              </div>

              <ConfirmModal
                visible={!!activeWorkoutModal}
                title="Active workout"
                description={`You have an active workout (${activeWorkout ? formatActiveDayLabel(activeWorkout.day, days) : ''}). Continue it or start a new one?`}
                primaryLabel="Continue current"
                primaryOnClick={handleContinueCurrent}
                secondaryLabel="Start new"
                secondaryOnClick={handleStartNew}
                secondaryLoading={switchingWorkout}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
