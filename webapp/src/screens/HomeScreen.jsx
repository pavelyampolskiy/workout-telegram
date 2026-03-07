import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
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

function ProgressRing({ progress, size = 80, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress * circumference);
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#ringGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      <defs>
        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MiniRecoveryRing({ score }) {
  const size = 56;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = score / 100;
  const offset = circumference - (progress * circumference);
  
  // Monochrome: brighter = better score
  const getColor = () => {
    if (score >= 85) return 'rgba(255, 255, 255, 0.9)';
    if (score >= 70) return 'rgba(255, 255, 255, 0.75)';
    if (score >= 50) return 'rgba(255, 255, 255, 0.55)';
    return 'rgba(255, 255, 255, 0.4)';
  };
  
  return (
    <div className="relative">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bebas text-sm" style={{ color: getColor() }}>{score}%</span>
      </div>
    </div>
  );
}

function WeeklyGoalWidget({ userId, recoveryScore }) {
  const [data, setData] = useState(undefined);
  const WEEKLY_GOAL = 3; // Target workouts per week

  useEffect(() => {
    Promise.all([
      api.getStats(userId, 7),
      api.getFrequency(userId),
    ]).then(([week, freq]) => {
      setData({
        weekCount: week.total ?? 0,
        totalVolume: week.by_type ? Object.values(week.by_type).reduce((a, b) => a + b, 0) : 0,
        total: freq.total ?? 0,
      });
    }).catch(() => setData(null));
  }, [userId]);

  if (data === undefined) {
    return (
      <div className="mt-5 rounded-2xl p-4" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <HomeStatsSkeleton />
      </div>
    );
  }
  if (!data) return null;

  const { weekCount, total } = data;
  const progress = Math.min(weekCount / WEEKLY_GOAL, 1);

  return (
    <div 
      className="mt-5 rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-center gap-4">
        {/* Weekly Goal Ring */}
        <div className="relative">
          <ProgressRing progress={progress} size={72} strokeWidth={5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-bebas text-xl text-white/90">{weekCount}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="font-bebas tracking-wider text-white/90 text-sm">Weekly Goal</div>
          <div className="text-white/40 text-xs font-sans mt-0.5">{weekCount} of {WEEKLY_GOAL} workouts</div>
        </div>
        
        {/* Mini Recovery Widget */}
        {recoveryScore !== null && (
          <div className="flex flex-col items-center">
            <MiniRecoveryRing score={recoveryScore} />
            <div className="font-bebas tracking-wider text-white/50 text-[10px] mt-1">Ready</div>
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
      className="mt-4 rounded-xl p-3 flex items-center gap-3"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="text-lg">🎯</div>
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
    navigate('day', { day: unfinished.type });
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
              background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.45) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Ready?</div>
          </div>
        </div>

        {/* Status widget */}
        <StatusWidget userId={userId} />

        {/* Weekly goal widget */}
        <WeeklyGoalWidget userId={userId} recoveryScore={recoveryData?.score ?? null} />

        {/* Smart reminder */}
        <SmartReminderBanner userId={userId} />

        {/* Continue workout banner */}
        {unfinished && (
          <div className="mt-4 relative">
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
                    <div className="text-xs text-white/40 font-bebas tracking-wider">{unfinished.type?.replace('DAY_', 'Day ') || 'Workout'}</div>
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

        {/* Push cards to bottom */}
        <div className="flex-1" />

        {/* Navigation widgets */}
        <div className="pb-6 space-y-2">
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
              <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}>
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
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
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
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
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
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                <TrophyIcon />
              </span>
              <div className="font-bebas tracking-wider text-white/80 text-sm">Achievements</div>
            </button>

            {/* Cardio */}
            <button
              onClick={() => navigate('workout', { cardioOnly: true })}
              className="card-press rounded-xl p-3 text-left h-20 flex flex-col justify-between"
              style={CARD_BTN_STYLE}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
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
