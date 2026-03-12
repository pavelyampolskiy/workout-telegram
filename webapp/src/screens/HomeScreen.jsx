import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE } from '../shared';
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
  const isGold = gradientId === 'ringReady' || gradientId === 'ringWeekly';
  const gradientStops = isGold
    ? [<stop key="a" offset="0%" stopColor="#E8D5B7"/>, <stop key="b" offset="50%" stopColor="#C9A96E"/>, <stop key="c" offset="100%" stopColor="#D4A574"/>]
    : [<stop key="a" offset="0%" stopColor="rgba(255,255,255,0.9)"/>, <stop key="b" offset="100%" stopColor="rgba(255,255,255,0.4)"/>];

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
                <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={(RING_SIZE-RING_STROKE)/2} fill="none" stroke="rgba(201,169,110,0.5)" strokeWidth={RING_STROKE} strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center" style={{ color: '#C9A96E' }}>
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
    <div className="mt-3 flex items-center gap-4">
      {parts.map((p, i) => (
        <span key={i} className="font-bebas tracking-wider text-white/55 text-sm">{p}</span>
      ))}
    </div>
  );
}

export default function HomeScreen() {
  const { navigate, userId, setActiveWorkout, recoveryData } = useApp();
  const [unfinished, setUnfinished] = useState(null);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [dismissing, setDismissing] = useState(false);

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
      startedAt: unfinished.created_at ? new Date(unfinished.created_at).getTime() : Date.now(),
      exerciseMap: {},
    });
    navigate('day', { day: unfinished.type, dayLabel: unfinished.label });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" />
      {/* Top gradient — absorbs Telegram header, keeps photo visible */}
      <div className="fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" style={{ zIndex: 0 }} />
      {/* Bottom gradient — grounds the cards */}
      <div className="fixed inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" style={{ zIndex: 0 }} />

      {/* Content: title top, nav block fixed at bottom */}
      <div className="relative z-10 flex flex-col min-h-screen p-5 pb-0">
        {/* Scrollable content area — pb ensures content not hidden behind fixed nav */}
        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-auto pb-64">
          {/* Headline */}
          <div className="pt-2 shrink-0">
            <div className="font-bebas leading-none w-full">
              <div style={{ fontSize: '9vw', letterSpacing: '0.32em', wordSpacing: '0.5em', color: 'rgba(255,255,255,0.75)' }}>Are you</div>
              <div style={{ 
                fontSize: '18vw', 
                letterSpacing: '0.36em',
                background: 'linear-gradient(180deg, #E8D5B7 0%, #C9A96E 25%, #D4A574 50%, #C2938A 75%, #B8A9A0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Ready?</div>
            </div>
          </div>

          {/* Status widget */}
          <StatusWidget userId={userId} />

          <div className="flex flex-col gap-4 mt-4">
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
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color: '#C9A96E' }}>
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
                        .then(() => {
                          setUnfinished(null);
                          setShowDismissConfirm(false);
                        })
                        .catch(() => {})
                        .finally(() => setDismissing(false));
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

          </div>
        </div>

        {/* Navigation block — fixed to bottom of viewport */}
        <div className="fixed bottom-0 left-0 right-0 z-10 max-w-lg mx-auto px-5 pt-2 pb-6 space-y-2" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
          {/* Big card - New Workout */}
          <button
            onClick={() => navigate('recovery-check')}
            className="card-press w-full rounded-xl p-4 text-left"
            style={{
              ...CARD_BTN_STYLE,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 0 30px rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(201,169,110,0.2)', color: '#C9A96E' }}>
                <WorkoutIcon />
              </span>
              <div className="flex-1">
                <div className="font-bebas tracking-wider text-xl text-white/95">New Workout</div>
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
              className="card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.15)', color: '#C9A96E' }}>
                <HistoryIcon />
              </span>
              <div className="font-bebas tracking-wider text-white/80 text-sm">History</div>
            </button>

            {/* Statistics */}
            <button
              onClick={() => navigate('stats')}
              className="card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.15)', color: '#C9A96E' }}>
                <StatsIcon />
              </span>
              <div className="font-bebas tracking-wider text-white/80 text-sm">Statistics</div>
            </button>

            {/* Achievements */}
            <button
              onClick={() => navigate('achievements')}
              className="card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.15)', color: '#C9A96E' }}>
                <TrophyIcon />
              </span>
              <div className="font-bebas tracking-wider text-white/80 text-sm">Achievements</div>
            </button>

            {/* Cardio */}
            <button
              onClick={() => navigate('cardio')}
              className="card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.15)', color: '#C9A96E' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </span>
              <div className="font-bebas tracking-wider text-white/80 text-sm">Cardio</div>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
