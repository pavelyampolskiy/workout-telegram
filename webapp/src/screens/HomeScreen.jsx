import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_MUTED, TEXT_FADED } from '../shared';
import { ACHIEVEMENT_CATEGORY_ICONS } from '../constants';
import { Spinner } from '../components/Spinner';
import { HomeStatsSkeleton } from '../components/Skeleton';
import { ConfirmModal } from '../components/ConfirmModal';
import homeBg from '../assets/gym-bg.png';

const WorkoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3.5 3.5"/>
  </svg>
);

const StatsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M4 20V12M8 20V16M12 20V8M16 20V14M20 20V4"/>
  </svg>
);

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"/>
    <path d="M6 3h12v6a6 6 0 01-12 0V3zM12 15v4M8 22h8M8 19h8"/>
  </svg>
);

const ITEMS = [
  { screen: 'workout', icon: <WorkoutIcon />, title: 'New Workout', primary: true },
  { screen: 'history', icon: <HistoryIcon />, title: 'History' },
  { screen: 'stats',   icon: <StatsIcon />,   title: 'Statistics' },
  { screen: 'achievements', icon: <TrophyIcon />, title: 'Achievements' },
];

const PRIMARY_CARD_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 100%) rgba(0,0,0,0.10)',
  border: '1px solid rgba(255,255,255,0.20)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), 0 0 22px rgba(255,255,255,0.09), 0 0 7px rgba(255,255,255,0.05)',
};

function daysAgoLabel(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return dateStr.split('-').slice(1).reverse().join('.');
}

const RING_SIZE = 60;
const RING_STROKE = 5;

function StatRing({ progress, value, label, sublabel, gradientId }) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress * circumference);
  const id = gradientId || 'ringGrad';
  const gradientStops = [<stop key="a" offset="0%" stopColor="rgba(255,255,255,0.95)"/>, <stop key="b" offset="100%" stopColor="rgba(255,255,255,0.6)"/>];

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={RING_SIZE} height={RING_SIZE} className="transform -rotate-90">
          <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={RING_STROKE}/>
          <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={radius} fill="none" stroke={`url(#${id})`} strokeWidth={RING_STROKE} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}/>
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
              {gradientStops}
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bebas text-lg ${TEXT_PRIMARY}`}>{value}</span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className={`font-bebas tracking-wider text-[10px] uppercase ${TEXT_TERTIARY}`}>{label}</div>
        <div className={`text-xs font-bebas tracking-wider mt-0.5 ${TEXT_SECONDARY}`}>{sublabel ?? '—'}</div>
      </div>
    </div>
  );
}

function WeeklyGoalWidget({ userId, recoveryScore }) {
  const [data, setData] = useState(undefined);
  const [lastAchievement, setLastAchievement] = useState(null);
  const WEEKLY_GOAL = 3;

  useEffect(() => {
    Promise.all([
      api.getStats(userId, 7),
      api.getFrequency(userId),
      api.getAchievements(userId),
    ]).then(([week, freq, ach]) => {
      setData({
        weekCount: week.total ?? 0,
        total: freq.total ?? 0,
      });
      if (ach.unlocked?.length > 0) {
        setLastAchievement(ach.unlocked[ach.unlocked.length - 1]);
      }
    }).catch(() => setData(null));
  }, [userId]);

  if (data === undefined) {
    return (
      <div className="rounded-2xl p-4" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <HomeStatsSkeleton />
      </div>
    );
  }
  if (!data) return null;

  const { weekCount } = data;
  const progress = Math.min(weekCount / WEEKLY_GOAL, 1);

  return (
    <div 
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-center justify-around gap-2">
        <StatRing
          progress={progress}
          value={weekCount}
          label="Weekly Goal"
          sublabel={`${weekCount} of ${WEEKLY_GOAL} workouts`}
          gradientId="ringWeekly"
        />
        {recoveryScore !== null && (
          <StatRing
            progress={recoveryScore / 100}
            value={`${recoveryScore}%`}
            label="Ready"
            sublabel="Recovery score"
            gradientId="ringReady"
          />
        )}
        {lastAchievement && (
          <div className="flex flex-col items-center">
            <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
              <svg width={RING_SIZE} height={RING_SIZE}>
                <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={(RING_SIZE-RING_STROKE)/2} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={RING_STROKE}/>
                <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={(RING_SIZE-RING_STROKE)/2} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={RING_STROKE} strokeLinecap="round"/>
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center ${TEXT_PRIMARY}`}>
                {ACHIEVEMENT_CATEGORY_ICONS[lastAchievement.type || 'workouts']}
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className={`font-bebas tracking-wider text-[10px] uppercase ${TEXT_TERTIARY}`}>Last Achievement</div>
              <div className={`text-xs font-bebas tracking-wider mt-0.5 ${TEXT_SECONDARY}`}>{lastAchievement.name}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SmartReminderBanner({ userId }) {
  const [reminder, setReminder] = useState(null);

  useEffect(() => {
    api.getSmartReminder(userId)
      .then(data => setReminder(data.reminder))
      .catch(() => {});
  }, [userId]);

  if (!reminder) return null;

  return (
    <div 
      className="rounded-xl p-3 flex items-center gap-3"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${TEXT_TERTIARY} shrink-0`}>
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
      <div className={`${TEXT_SECONDARY} text-xs font-sans flex-1`}>{reminder}</div>
    </div>
  );
}

function StatusWidget({ userId }) {
  const [stats, setStats] = useState(undefined); // undefined = loading

  useEffect(() => {
    Promise.all([
      api.getHistory(userId, 0, 1),
      api.getStats(userId, 7),
      api.getFrequency(userId),
    ]).then(([hist, week, freq]) => {
      setStats({
        lastDate: hist.items?.[0]?.date ?? null,
        weekCount: week.total ?? 0,
        total: freq.total ?? 0,
      });
    }).catch(() => setStats(null));
  }, [userId]);

  if (stats === undefined) return <HomeStatsSkeleton />;
  if (!stats) return null;

  const { lastDate, weekCount, total } = stats;
  const parts = [
    `${total} workout${total !== 1 ? 's' : ''}`,
    lastDate ? `Last ${daysAgoLabel(lastDate)}` : null,
    `${weekCount} this week`,
  ].filter(Boolean);

  return (
    <div className="mt-0.5 flex items-center gap-4">
      {parts.map((p, i) => (
        <span key={i} className={`font-bebas tracking-wider text-sm ${TEXT_TERTIARY}`}>{p}</span>
      ))}
    </div>
  );
}

export default function HomeScreen() {
  const { navigate, userId, setActiveWorkout, recoveryData, showToast } = useApp();
  const [unfinished, setUnfinished] = useState(null);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [showCardioActiveModal, setShowCardioActiveModal] = useState(false);
  const [switchingToCardio, setSwitchingToCardio] = useState(false);

  useEffect(() => {
    if (!userId) return;
    api.getUnfinishedWorkout(userId)
      .then(data => setUnfinished(data.workout))
      .catch(() => {});
  }, [userId]);

  const handleContinue = () => {
    if (!unfinished) return;
    setActiveWorkout({
      id: unfinished.id,
      day: unfinished.type,
      startedAt: Date.now(),
      exerciseMap: {},
    });
    navigate('day', { day: unfinished.type, dayLabel: unfinished.label });
  };

  const isRecoveryDoneToday = () => {
    const ts = recoveryData?.timestamp;
    if (!ts) return false;
    const d = new Date(ts);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const handleNewWorkout = () => {
    if (isRecoveryDoneToday()) {
      navigate('workout');
    } else {
      navigate('recovery-check');
    }
  };

  const handleCardioPress = () => {
    if (unfinished) {
      setShowCardioActiveModal(true);
    } else {
      navigate('cardio');
    }
  };

  const handleContinueCurrentWorkout = () => {
    setShowCardioActiveModal(false);
    if (unfinished?.type === 'CARDIO') {
      navigate('cardio');
    } else {
      setActiveWorkout({
        id: unfinished.id,
        day: unfinished.type,
        startedAt: unfinished.created_at ? new Date(unfinished.created_at).getTime() : Date.now(),
        exerciseMap: {},
      });
      navigate('day', { day: unfinished.type, dayLabel: unfinished.label });
    }
  };

  const handleStartNewCardio = async () => {
    if (!unfinished) return;
    setSwitchingToCardio(true);
    try {
      await api.deleteWorkout(unfinished.id);
      setUnfinished(null);
      setActiveWorkout(null);
      setShowCardioActiveModal(false);
      navigate('cardio');
    } catch (e) {
      showToast(e.message);
    } finally {
      setSwitchingToCardio(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg image={homeBg} overlay="bg-black/50" />
      {/* Top gradient — absorbs Telegram header, keeps photo visible */}
      <div className="fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" style={{ zIndex: 0 }} />
      {/* Bottom gradient — grounds the cards */}
      <div className="fixed inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" style={{ zIndex: 0 }} />

      {/* Content: title top, nav flows below content to avoid huge center gap */}
      <div className="relative z-10 flex flex-col min-h-screen safe-top p-5 pb-0">
        {/* Scrollable content area — New Workout in flow; 2x2 grid fixed at bottom */}
        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto overflow-x-hidden pb-64">
          {/* Headline + status — close together */}
          <div className="pt-6 shrink-0 space-y-0.5">
            <div className="font-bebas leading-none w-full">
              <div className={TEXT_TERTIARY} style={{ fontSize: '9vw', letterSpacing: '0.32em', wordSpacing: '0.5em' }}>Are you</div>
              <div className={TEXT_PRIMARY} style={{ fontSize: '18vw', letterSpacing: '0.36em' }}>Ready?</div>
            </div>
            <StatusWidget userId={userId} />
          </div>

          <div className="flex flex-col gap-4 mt-4 flex-none">
            {/* Weekly goal widget */}
            <WeeklyGoalWidget userId={userId} recoveryScore={recoveryData?.score ?? null} />

            {/* Smart reminder */}
            <SmartReminderBanner userId={userId} />

            {/* Continue workout banner */}
            {unfinished && (
            <div className="relative">
            {!showDismissConfirm ? (
              <>
                <button
                  onClick={handleContinue}
                  className="card-press w-full rounded-xl p-4 text-left"
                  style={{
                    ...CARD_BTN_STYLE,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 0 30px rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white/20 ${TEXT_PRIMARY}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    </span>
                    <div className="flex-1">
                      <div className={`font-bebas tracking-wider text-xl ${TEXT_PRIMARY}`}>Continue Workout</div>
                      <div className={`text-[10px] font-sans ${TEXT_MUTED}`}>{unfinished.label || unfinished.type?.replace('DAY_', 'Day ') || 'Workout'}</div>
                    </div>
                    <span className={`text-xl shrink-0 ${TEXT_FADED}`}>›</span>
                  </div>
                </button>
                <button
                  onClick={() => setShowDismissConfirm(true)}
                  className={`w-full text-center text-xs font-bebas tracking-wider py-2 mt-1 ${TEXT_FADED}`}
                >
                  Dismiss
                </button>
              </>
            ) : createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/80" aria-modal="true" role="dialog">
                <div 
                  className="w-full max-w-sm rounded-2xl p-5"
                  style={{
                    background: 'rgba(0, 0, 0, 0.95)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.6)',
                  }}
                >
                  <h3 className={`font-bebas text-lg tracking-wider mb-1 ${TEXT_PRIMARY}`}>Dismiss workout?</h3>
                  <p className={`text-sm mb-5 font-sans ${TEXT_MUTED}`}>This unfinished workout will be deleted.</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setShowDismissConfirm(false)}
                      className={`card-press w-full font-bebas tracking-wider text-base py-3 rounded-xl ${TEXT_PRIMARY}`}
                      style={CARD_BTN_STYLE}
                    >
                      Keep it
                    </button>
                    <button
                      onClick={() => {
                        setDismissing(true);
                        api.deleteWorkout(unfinished.id)
                          .then(() => {
                            setUnfinished(null);
                            setShowDismissConfirm(false);
                          })
                          .catch(e => showToast(e.message))
                          .finally(() => setDismissing(false));
                      }}
                      disabled={dismissing}
                      className={`w-full py-3 font-bebas tracking-wider text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${TEXT_TERTIARY} active:text-white/80`}
                    >
                      {dismissing ? (
                        <>
                          <Spinner size={16} />
                          Deleting…
                        </>
                      ) : (
                        'Delete workout'
                      )}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}
          </div>

        </div>

        {/* Fixed bottom: New Workout + 2x2 grid */}
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-5 pt-4 pb-6 safe-bottom z-20 bg-gradient-to-t from-black via-black/95 to-transparent">
          <div className="space-y-2">
            <button
              onClick={handleNewWorkout}
              className={`card-press w-full rounded-xl p-4 text-left transition-opacity ${unfinished ? 'opacity-50' : ''}`}
              style={{
                ...CARD_BTN_STYLE,
                background: unfinished
                  ? 'rgba(255,255,255,0.04)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%)',
                boxShadow: unfinished ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.2), 0 0 30px rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${unfinished ? 'bg-white/10' : 'bg-white/20'} ${TEXT_PRIMARY}`}>
                  <WorkoutIcon />
                </span>
                <div className="flex-1">
                  <div className={`font-bebas tracking-wider text-xl ${unfinished ? TEXT_MUTED : TEXT_PRIMARY}`}>New Workout</div>
                  <div className={`text-[10px] font-sans ${TEXT_MUTED}`}>Start your training session</div>
                </div>
                <span className={`text-xl ${TEXT_FADED}`}>›</span>
              </div>
            </button>
          <div className="grid grid-cols-2 gap-2">
            {/* History */}
            <button
              onClick={() => navigate('history')}
              className="card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/15 ${TEXT_PRIMARY}`}>
                <HistoryIcon />
              </span>
              <div className={`font-bebas tracking-wider text-sm ${TEXT_SECONDARY}`}>History</div>
            </button>

            {/* Statistics */}
            <button
              onClick={() => navigate('stats')}
              className="card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/15 ${TEXT_PRIMARY}`}>
                <StatsIcon />
              </span>
              <div className={`font-bebas tracking-wider text-sm ${TEXT_SECONDARY}`}>Statistics</div>
            </button>

            {/* Achievements */}
            <button
              onClick={() => navigate('achievements')}
              className="card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/15 ${TEXT_PRIMARY}`}>
                <TrophyIcon />
              </span>
              <div className={`font-bebas tracking-wider text-sm ${TEXT_SECONDARY}`}>Achievements</div>
            </button>

            {/* Cardio */}
            <button
              onClick={handleCardioPress}
              className="card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/15 ${TEXT_PRIMARY}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </span>
              <div className={`font-bebas tracking-wider text-sm ${TEXT_SECONDARY}`}>Cardio</div>
            </button>
          </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        visible={showCardioActiveModal}
        title="Active workout"
        description={unfinished ? `You have an active workout (${unfinished.label || unfinished.type || 'Workout'}). Continue it or start a new one?` : ''}
        primaryLabel="Continue current"
        primaryOnClick={handleContinueCurrentWorkout}
        secondaryLabel="Start new"
        secondaryOnClick={handleStartNewCardio}
        secondaryLoading={switchingToCardio}
      />
    </div>
  );
}
