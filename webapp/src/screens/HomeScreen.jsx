import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_MUTED, TEXT_FADED } from '../shared';
import { Spinner } from '../components/Spinner';
import { HomeStatsSkeleton } from '../components/Skeleton';
import homeBg from '../assets/gym-bg.jpg';

/** Единая толщина контура всех иконок (часы, графики, кубок, гантель, список). */
const ICON_STROKE = 1;
const WorkoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);
const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3.5 3.5"/>
  </svg>
);
const StatsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M4 20V12M8 20V16M12 20V8M16 20V14M20 20V4"/>
  </svg>
);
const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"/>
    <path d="M6 3h12v6a6 6 0 01-12 0V3zM12 15v4M8 22h8M8 19h8"/>
  </svg>
);
const ProgramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
  </svg>
);

const ITEMS = [
  { screen: 'workout', icon: <WorkoutIcon />, title: 'New Workout', primary: true },
  { screen: 'history', icon: <HistoryIcon />, title: 'History' },
  { screen: 'stats',   icon: <StatsIcon />,   title: 'Statistics' },
  { screen: 'achievements', icon: <TrophyIcon />, title: 'Achievements' },
];

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
    <div className="mt-0.5 flex items-center justify-between w-full gap-2">
      {parts.map((p, i) => (
        <span key={i} className="font-bebas tracking-wider text-sm text-white/50">{p}</span>
      ))}
    </div>
  );
}

export default function HomeScreen() {
  const { navigate, userId, setActiveWorkout, recoveryData, showToast } = useApp();
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
    if (unfinished.type && String(unfinished.type).toUpperCase() === 'CARDIO') {
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

  const isRecoveryDoneToday = () => {
    const ts = recoveryData?.timestamp;
    if (!ts) return false;
    const d = new Date(ts);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const handleNewWorkout = () => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
    if (isRecoveryDoneToday()) {
      navigate('workout');
    } else {
      navigate('recovery-check');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg image={homeBg} overlay="bg-black/65" blur={1} scale={1} />
      {/* Top gradient — absorbs Telegram header, keeps photo visible */}
      <div className="fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" style={{ zIndex: 0 }} />
      {/* Bottom gradient — grounds the cards */}
      <div className="fixed inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent" style={{ zIndex: 0 }} />

      {/* Content: header + widget shrink, button block fills remaining space */}
      <div className="relative z-10 flex flex-col min-h-screen safe-top safe-bottom p-5 max-w-lg mx-auto">
        {/* Header + widget — compact, no scroll */}
        <div className="shrink-0 flex flex-col gap-4">
          {/* Headline + status */}
          <div className="pt-6 w-full">
            <div className="font-bebas leading-none w-full min-w-0 whitespace-nowrap" style={{ maxWidth: '100%', fontSize: 'clamp(17px, 10vw, 42px)' }}>
              <span className="text-white/50 font-normal" style={{ letterSpacing: '0.31em', fontSize: '0.9em' }}>ARE YOU </span>
              <span className="text-white font-bold" style={{ letterSpacing: '0.25em', fontSize: '1.08em' }}>READY</span><span className="text-white font-bold" style={{ marginLeft: '0.06em', fontSize: '1.08em' }}>?</span>
            </div>
            <div className="mt-4">
              <StatusWidget userId={userId} />
            </div>
          </div>
        </div>

        {/* Button block — fills all space from widget to bottom */}
        <div className="flex-1 min-h-0 flex flex-col gap-3 pt-4">
          {unfinished && !showDismissConfirm ? (
            <>
              <div className="flex-1 min-h-0 flex flex-col gap-3">
                <button
                  onClick={handleContinue}
                  className="btn-active-style card-press w-full rounded-xl p-4 flex-1 min-h-0 flex flex-col justify-between items-center"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <span className="shrink-0 flex items-center justify-center text-white/50">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                      <path d="M5 3l14 9-14 9V3z"/>
                    </svg>
                  </span>
                  <div className="flex items-center justify-center gap-2 shrink-0 flex-wrap">
                    <span className="font-bebas tracking-wider text-xl text-white" style={{ letterSpacing: '1.5px' }}>Continue Workout: </span>
                    <span className={`font-bebas tracking-wider text-xl ${TEXT_MUTED}`} style={{ letterSpacing: '1.5px' }}>{unfinished.label || unfinished.type?.replace('DAY_', 'Day ') || 'Workout'}</span>
                  </div>
                </button>
                <button
                  onClick={handleNewWorkout}
                  className="w-full p-4 flex-1 min-h-0 flex flex-col justify-between items-center card-press opacity-50 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.035)' }}
                >
                  <span className="shrink-0 flex items-center justify-center text-white/40">
                    <WorkoutIcon />
                  </span>
                  <span className={`font-bebas tracking-wider text-xl shrink-0 ${TEXT_MUTED}`} style={{ letterSpacing: '1.5px' }}>New Workout</span>
                </button>
              </div>
              <button
                onClick={() => setShowDismissConfirm(true)}
                className={`w-full text-center text-xs font-bebas tracking-wider py-2 shrink-0 ${TEXT_FADED}`}
              >
                Dismiss
              </button>
            </>
          ) : (
            <button
              onClick={handleNewWorkout}
              className="w-full p-4 flex-1 min-h-0 flex flex-col justify-between items-center card-press rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="shrink-0 flex items-center justify-center text-white/50">
                <WorkoutIcon />
              </span>
              <span className="font-bebas tracking-wider text-xl shrink-0 text-white" style={{ letterSpacing: '1.5px' }}>New Workout</span>
            </button>
          )}
          {unfinished && showDismissConfirm && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/80 backdrop-blur-xl" style={{ WebkitBackdropFilter: 'blur(24px)' }} aria-modal="true" role="dialog">
              <div 
                className="w-full max-w-sm rounded-2xl p-5"
                style={{
                  background: 'rgba(0, 0, 0, 0.92)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
              >
                <h3 className={`font-bebas text-lg tracking-wider mb-1 ${TEXT_PRIMARY}`}>Dismiss workout?</h3>
                <p className={`text-sm mb-5 font-sans ${TEXT_MUTED}`}>This unfinished workout will be deleted.</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowDismissConfirm(false)}
                    className={`btn-active-style card-press w-full font-bebas tracking-wider text-base py-3 rounded-[14px] ${TEXT_PRIMARY}`}
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
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0 grid-rows-2">
            <button
              onClick={() => navigate('history')}
              className="card-press p-4 min-h-0 flex flex-col justify-between items-center min-w-0 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="shrink-0 flex items-center justify-center text-white/50">
                <HistoryIcon />
              </span>
              <div className="font-bebas tracking-wider text-white/50 text-base truncate w-full text-center" style={{ letterSpacing: '1.5px' }}>History</div>
            </button>
            <button
              onClick={() => navigate('stats')}
              className="card-press p-4 min-h-0 flex flex-col justify-between items-center min-w-0 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="shrink-0 flex items-center justify-center text-white/50">
                <StatsIcon />
              </span>
              <div className="font-bebas tracking-wider text-white/50 text-base truncate w-full text-center" style={{ letterSpacing: '1.5px' }}>Statistics</div>
            </button>
            <button
              onClick={() => navigate('achievements')}
              className="card-press p-4 min-h-0 flex flex-col justify-between items-center min-w-0 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="shrink-0 flex items-center justify-center text-white/50">
                <TrophyIcon />
              </span>
              <div className="font-bebas tracking-wider text-white/50 text-base truncate w-full text-center" style={{ letterSpacing: '1.5px' }}>Achievements</div>
            </button>
            <button
              onClick={() => navigate('program')}
              className="card-press p-4 min-h-0 flex flex-col justify-between items-center min-w-0 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="shrink-0 flex items-center justify-center text-white/50">
                <ProgramIcon />
              </span>
              <div className="font-bebas tracking-wider text-white/50 text-base truncate w-full text-center" style={{ letterSpacing: '1.5px' }}>My program</div>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
