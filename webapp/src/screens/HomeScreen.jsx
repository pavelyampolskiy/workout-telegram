import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { CARD_BTN_STYLE, AURA_TEXT } from '../shared';
import { Spinner } from '../components/Spinner';
import { HomeStatsSkeleton } from '../components/Skeleton';

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

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={RING_SIZE} height={RING_SIZE} className="transform -rotate-90">
          <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={RING_STROKE}/>
          <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={radius} fill="none" stroke={`url(#${id})`} strokeWidth={RING_STROKE} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}/>
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(234,234,234,0.92)"/>
              <stop offset="100%" stopColor="rgba(197,160,89,0.62)"/>
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bebas text-lg text-white/90">{value}</span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="font-bebas tracking-wider text-white/55 text-[10px] uppercase">{label}</div>
        <div className="text-white/90 text-xs font-bebas tracking-wider mt-0.5">{sublabel ?? '—'}</div>
      </div>
    </div>
  );
}

const ACHIEVEMENT_CATEGORY_ICONS = {
  volume: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"/>
      <path d="M6 3h12v6a6 6 0 01-12 0V3zM12 15v4M8 22h8M8 19h8"/>
    </svg>
  ),
  workouts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  weekly: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  cardio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  ),
  weekly_streak: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
    </svg>
  ),
};

function WeeklyGoalWidget({ userId, recoveryScore }) {
  const [data, setData] = useState(undefined);
  const [lastAchievement, setLastAchievement] = useState(null);
  const WEEKLY_GOAL = 3;

  useEffect(() => {
    Promise.all([
      api.getStats((new Date().getDay() + 6) % 7),
      api.getFrequency(),
      api.getAchievements(),
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
                <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={(RING_SIZE-RING_STROKE)/2} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={RING_STROKE} strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {ACHIEVEMENT_CATEGORY_ICONS[lastAchievement.type || 'workouts']}
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className="font-bebas tracking-wider text-white/55 text-[10px] uppercase">Last Achievement</div>
              <div className="text-white/90 text-xs font-bebas tracking-wider mt-0.5">{lastAchievement.name}</div>
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
    api.getSmartReminder()
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white/60 shrink-0">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
      <div className="text-white/70 text-xs font-sans flex-1">{reminder}</div>
    </div>
  );
}

function StatusWidget({ userId }) {
  const [stats, setStats] = useState(undefined); // undefined = loading

  useEffect(() => {
    Promise.all([
      api.getHistory(0, 1),
      api.getStats((new Date().getDay() + 6) % 7),
      api.getFrequency(),
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
    <div className="mt-3 flex items-center gap-4">
      {parts.map((p, i) => (
        <span key={i} className="font-bebas tracking-wider text-white/55 text-sm">{p}</span>
      ))}
    </div>
  );
}

const RESUME_CARD_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.11) 0%, transparent 100%) rgba(0,0,0,0.15)',
  border: '1px solid rgba(255,255,255,0.28)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 0 28px rgba(255,255,255,0.10)',
};

const ResumeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

export default function HomeScreen() {
  const { navigate, userId, setActiveWorkout, recoveryData, activeWorkout } = useApp();
  const [unfinished, setUnfinished] = useState(null);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [showActiveWarning, setShowActiveWarning] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const [discarding, setDiscarding] = useState(false);

  // Re-fetch when returning to HomeScreen (activeWorkout becomes null after cancel/save)
  useEffect(() => {
    if (!userId) return;
    api.getUnfinishedWorkout()
      .then(data => setUnfinished(data.workout))
      .catch(() => {});
  }, [userId, activeWorkout]);

  const guardedNavigate = (screen) => {
    if (unfinished) {
      // Cardio → existing cardio: just restore, no warning needed
      if (screen === 'cardio' && unfinished.type === 'CARDIO') {
        navigate('cardio');
        return;
      }
      setPendingNav(screen);
      setShowActiveWarning(true);
    } else {
      navigate(screen);
    }
  };

  const handleDiscardAndNavigate = async () => {
    setDiscarding(true);
    try {
      await api.deleteWorkout(unfinished.id);
      setUnfinished(null);
    } catch { /* best-effort */ }
    setShowActiveWarning(false);
    setDiscarding(false);
    navigate(pendingNav);
  };

  const handleContinue = () => {
    if (!unfinished) return;
    if (unfinished.type === 'CARDIO') {
      navigate('cardio');
      return;
    }
    setActiveWorkout({
      id: unfinished.id,
      day: unfinished.type,
      startedAt: unfinished.created_at ? new Date(unfinished.created_at).getTime() : Date.now(),
      exerciseMap: {},
    });
    navigate('day', { day: unfinished.type, dayLabel: unfinished.label });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blurred background */}
      <div
        className="absolute inset-0 scale-110"
        style={{ backgroundImage: 'url(/gym-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/65" />
      {/* Top gradient — absorbs Telegram header */}
      <div className="absolute inset-x-0 top-0 h-32 bg-black/90" />
      <div className="absolute inset-x-0 top-32 h-24 bg-gradient-to-b from-black/90 to-transparent" />
      {/* Bottom gradient — grounds the cards */}
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Content: title top, cards bottom */}
      <div className="relative z-10 flex flex-col min-h-screen p-5">
        {/* Headline */}
        <div className="pt-2">
          <div className="font-bebas leading-none w-full">
            <div style={{ fontSize: '9vw', letterSpacing: '0.32em', wordSpacing: '0.5em', color: 'rgba(255,255,255,0.75)' }}>Are you</div>
            <div style={{
              fontSize: '18vw',
              letterSpacing: '0.36em',
              background: 'linear-gradient(180deg, rgba(234,234,234,0.92) 0%, rgba(197,160,89,0.62) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Ready?</div>
          </div>
        </div>

        {/* Status widget */}
        <StatusWidget userId={userId} />

        {/* Content with consistent spacing */}
        <div className="flex-1 flex flex-col gap-4 mt-4">
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
                  className="card-press w-full rounded-2xl p-4 text-left flex items-center gap-4"
                  style={{
                    ...CARD_BTN_STYLE,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 0 25px rgba(255,255,255,0.12), 0 0 10px rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color: 'rgba(255,255,255,0.82)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div 
                      className="font-bebas tracking-wider text-lg"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.5) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >Continue Workout</div>
                    <div className="text-xs text-white/40 font-bebas tracking-wider">{unfinished.label || unfinished.type?.replace('DAY_', 'Day ') || 'Workout'}</div>
                  </div>
                  <span className="text-xl shrink-0 text-white/35">›</span>
                </button>
                <button
                  onClick={() => setShowDismissConfirm(true)}
                  className="w-full text-center text-white/30 text-xs font-bebas tracking-wider py-2 mt-1"
                >
                  Dismiss
                </button>
              </>
            ) : (
              <div 
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)',
                }}
              >
                <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-1">Dismiss workout?</h3>
                <p className="text-sm text-white/40 mb-5 font-sans">This unfinished workout will be deleted.</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowDismissConfirm(false)}
                    className="card-press w-full text-white/90 font-bebas tracking-wider text-base py-3 rounded-xl"
                    style={CARD_BTN_STYLE}
                  >
                    Keep it
                  </button>
                  <button
                    onClick={() => {
                      setDismissing(true);
                      api.deleteWorkout(unfinished.id)
                        .catch(() => {})
                        .finally(() => {
                          setUnfinished(null);
                          setShowDismissConfirm(false);
                          setDismissing(false);
                        });
                    }}
                    disabled={dismissing}
                    className="w-full text-white/50 active:text-white/80 py-3 font-bebas tracking-wider text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
            )}
          </div>
        )}

          {/* Navigation widgets */}
          <div className="mt-auto pt-2 pb-6 space-y-2">
          {/* Big card - New Workout */}
          <button
            onClick={() => guardedNavigate('recovery-check')}
            className="card-press w-full rounded-xl p-4 text-left"
            style={{
              background: 'linear-gradient(90deg, rgba(140,105,45,0.92) 0%, rgba(210,165,75,0.96) 28%, rgba(238,234,218,1.0) 58%, rgba(200,158,65,0.95) 80%, rgba(140,105,45,0.90) 100%)',
              boxShadow: '0 2px 20px rgba(197,160,89,0.25), inset 0 1px 0 rgba(255,255,255,0.35)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}>
                <WorkoutIcon />
              </span>
              <div className="flex-1">
                <div className="font-bebas tracking-wider text-xl" style={AURA_TEXT}>New Workout</div>
                <div className="text-white/40 text-[10px] font-sans">Start your training session</div>
              </div>
              <span className="text-xl text-white/30">›</span>
            </div>
          </button>

          {/* 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* History */}
            <button
              onClick={() => navigate('history')}
              className="aura-nav-btn card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                <HistoryIcon />
              </span>
              <div className="nav-label font-bebas tracking-wider text-white/80 text-sm">History</div>
            </button>

            {/* Statistics */}
            <button
              onClick={() => navigate('stats')}
              className="aura-nav-btn card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                <StatsIcon />
              </span>
              <div className="nav-label font-bebas tracking-wider text-white/80 text-sm">Statistics</div>
            </button>

            {/* Achievements */}
            <button
              onClick={() => navigate('achievements')}
              className="aura-nav-btn card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                <TrophyIcon />
              </span>
              <div className="nav-label font-bebas tracking-wider text-white/80 text-sm">Achievements</div>
            </button>

            {/* Cardio */}
            <button
              onClick={() => guardedNavigate('cardio')}
              className="aura-nav-btn card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </span>
              <div className="nav-label font-bebas tracking-wider text-white/80 text-sm">Cardio</div>
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Active workout warning modal */}
      {showActiveWarning && unfinished && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="modal-content mx-6 w-full max-w-sm bg-black/90 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-1">Active Workout</h3>
            <p className="text-sm text-white/40 mb-6 font-sans">
              You have an unfinished {unfinished.label || unfinished.type?.replace('DAY_', 'Day ') || 'workout'}. Starting a new one will discard it.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowActiveWarning(false); handleContinue(); }}
                className="card-press w-full text-white/90 font-bebas tracking-wider text-base py-3 rounded-xl"
                style={CARD_BTN_STYLE}
              >
                Continue {unfinished.label || 'Workout'}
              </button>
              <button
                onClick={handleDiscardAndNavigate}
                disabled={discarding}
                className="w-full text-white/45 active:text-white/70 disabled:opacity-40 py-3 font-bebas tracking-wider text-sm transition-colors"
              >
                {discarding ? 'Discarding…' : 'Discard and start new'}
              </button>
              <button
                onClick={() => setShowActiveWarning(false)}
                className="w-full text-white/25 active:text-white/50 py-2 font-bebas tracking-wider text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
