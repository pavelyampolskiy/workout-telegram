import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_MUTED, TEXT_FADED } from '../shared';
import { Spinner } from '../components/Spinner';
import { HomeStatsSkeleton } from '../components/Skeleton';
import SupplementsWidget from '../components/SupplementsWidget';
import BodyMetricsWidget from '../components/BodyMetricsWidget';
import DragDropGrid from '../components/DragDropGrid';
import EditModeToggle from '../components/EditModeToggle';
import homeBg from '../assets/gym-bg.jpg';

const SupplementsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <ellipse cx="12" cy="12" rx="8" ry="5" transform="rotate(15 12 12)"/>
    <path d="M12 7v10M8 9l8 0M8 15l8 0"/>
  </svg>
);

/** Единая толщина контура всех иконок. */
const ICON_STROKE = 1;
/** Фон всех карточек/плашек на главном экране (без границ). */
const CARD_BG = 'rgba(255,255,255,0.03)';
/** Стиль обёртки иконки в карточке. */
const ICON_WRAPPER = 'shrink-0 flex items-center justify-center text-white';
/** Стиль подписи в карточке (иконка + текст). */
const LABEL_STYLE = { letterSpacing: '1.5px' };
const LABEL_CLASS = 'font-bebas tracking-wider text-xl';
const LABEL_CLASS_MUTED = 'font-bebas tracking-wider text-base text-white/50 truncate w-full text-center';
const WorkoutIcon = ({ className, style } = {}) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" className={className || 'w-7 h-7'} style={style}>
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

const MetricsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="3" y="13" width="18" height="8" rx="2"/>
    <path d="M6 13V8a6 6 0 0112 0v5"/>
    <circle cx="12" cy="17" r="1"/>
    <path d="M8 17h8"/>
  </svg>
);

const BUTTON_CONFIG = {
  history: { screen: 'history', icon: <HistoryIcon />, title: 'History' },
  stats: { screen: 'stats', icon: <StatsIcon />, title: 'Statistics' },
  achievements: { screen: 'achievements', icon: <TrophyIcon />, title: 'Achievements' },
  program: { screen: 'program', icon: <ProgramIcon />, title: 'My program' },
  supplements: { screen: 'supplements', icon: <SupplementsIcon />, title: 'Current supplements', component: <SupplementsWidget /> },
  metrics: { screen: 'metrics', icon: <MetricsIcon />, title: 'Body Metrics', component: <BodyMetricsWidget /> }
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

function StatusWidget({ userId }) {
  const [stats, setStats] = useState(undefined); // undefined = loading

  useEffect(() => {
    Promise.all([
      api.getHistory(userId, 0, 1),
      api.getStats(userId, 7, true), // true = current calendar week (Mon–today)
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
    <div className="mt-0 flex flex-nowrap items-center justify-between gap-x-2 w-full min-w-0">
      {parts.map((p, i) => (
        <span
          key={i}
          className="font-bebas text-white/25 shrink-0 whitespace-nowrap"
          style={{ fontSize: '0.82rem', letterSpacing: '0.08em', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

export default function HomeScreen() {
  const { navigate, userId, setActiveWorkout, recoveryData, showToast } = useApp();
  const [unfinished, setUnfinished] = useState(null);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [gridItems, setGridItems] = useState([]);
  const dismissModalRef = useRef(null);
  useFocusTrap(dismissModalRef, !!(unfinished && showDismissConfirm));

  // Initialize grid items after component mount
  useEffect(() => {
    setGridItems(createGridItems(editMode, navigate));
  }, []);

  // Update grid items when editMode changes
  useEffect(() => {
    setGridItems(createGridItems(editMode, navigate));
  }, [editMode]);

  // Exit edit mode when clicking on empty space
  const handleEmptySpaceClick = () => {
    if (editMode) {
      setEditMode(false);
      saveLayout();
    }
  };

  // Сохранение расстановки
  const saveLayout = () => {
    try {
      localStorage.setItem('grid_layout', JSON.stringify(gridItems));
      console.log('Layout saved successfully');
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  };

  // Функция создания элементов сетки
  const createGridItems = (isEditMode, navigateFn) => {
    return [
      {
        id: 'history',
        type: 'button',
        size: { cols: 1, rows: 1 },
        content: (
          <button
            onClick={() => !isEditMode && navigateFn('history')}
            className="w-full h-full flex flex-row justify-between items-center p-4"
            disabled={isEditMode}
          >
            <span className="shrink-0 flex items-center justify-center text-white/25"><HistoryIcon /></span>
            <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>History</div>
          </button>
        )
      },
      {
        id: 'stats',
        type: 'button',
        size: { cols: 1, rows: 1 },
        content: (
          <button
            onClick={() => !isEditMode && navigateFn('stats')}
            className="w-full h-full flex flex-row justify-between items-center p-4"
            disabled={isEditMode}
          >
            <span className="shrink-0 flex items-center justify-center text-white/25"><StatsIcon /></span>
            <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>Statistics</div>
          </button>
        )
      },
      {
        id: 'achievements',
        type: 'button',
        size: { cols: 1, rows: 1 },
        content: (
          <button
            onClick={() => !isEditMode && navigateFn('achievements')}
            className="w-full h-full flex flex-row justify-between items-center p-4"
            disabled={isEditMode}
          >
            <span className="shrink-0 flex items-center justify-center text-white/25"><TrophyIcon /></span>
            <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>Achievements</div>
          </button>
        )
      },
      {
        id: 'program',
        type: 'button',
        size: { cols: 1, rows: 1 },
        content: (
          <button
            onClick={() => !isEditMode && navigateFn('program')}
            className="w-full h-full flex flex-row justify-between items-center p-4"
            disabled={isEditMode}
          >
            <span className="shrink-0 flex items-center justify-center text-white/25"><ProgramIcon /></span>
            <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>My program</div>
          </button>
        )
      },
      {
        id: 'supplements',
        type: 'widget',
        size: { cols: 2, rows: 1 },
        content: <SupplementsWidget />
      },
      {
        id: 'body-metrics',
        type: 'widget',
        size: { cols: 2, rows: 1 },
        content: <BodyMetricsWidget />
      }
    ];
  };

  // Default grid items configuration
  function getDefaultGridItems() {
    return [
      {
        id: 'history',
        type: 'button',
        size: { cols: 1, rows: 1 },
        content: (
          <button
            onClick={() => !editMode && navigate('history')}
            className="w-full h-full flex flex-row justify-between items-center p-4"
            disabled={editMode}
          >
            <span className="shrink-0 flex items-center justify-center text-white/25"><HistoryIcon /></span>
            <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>History</div>
          </button>
        )
      },
      {
        id: 'stats',
        type: 'button',
        size: { cols: 1, rows: 1 },
        content: (
          <button
            onClick={() => !editMode && navigate('stats')}
            className="w-full h-full flex flex-row justify-between items-center p-4"
            disabled={editMode}
          >
            <span className="shrink-0 flex items-center justify-center text-white/25"><StatsIcon /></span>
            <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>Statistics</div>
          </button>
        )
      },
      {
        id: 'achievements',
        type: 'button',
        size: { cols: 1, rows: 1 },
        content: (
          <button
            onClick={() => !editMode && navigate('achievements')}
            className="w-full h-full flex flex-row justify-between items-center p-4"
            disabled={editMode}
          >
            <span className="shrink-0 flex items-center justify-center text-white/25"><TrophyIcon /></span>
            <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>Achievements</div>
          </button>
        )
      },
      {
        id: 'program',
        type: 'button',
        size: { cols: 1, rows: 1 },
        content: (
          <button
            onClick={() => !editMode && navigate('program')}
            className="w-full h-full flex flex-row justify-between items-center p-4"
            disabled={editMode}
          >
            <span className="shrink-0 flex items-center justify-center text-white/25"><ProgramIcon /></span>
            <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>My program</div>
          </button>
        )
      },
      {
        id: 'supplements',
        type: 'widget',
        size: { cols: 2, rows: 1 },
        content: <SupplementsWidget />
      },
      {
        id: 'body-metrics',
        type: 'widget',
        size: { cols: 2, rows: 1 },
        content: <BodyMetricsWidget />
      }
    ];
  }

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
    const startedAt = unfinished.created_at
      ? new Date(unfinished.created_at.replace(' ', 'T') + 'Z').getTime()
      : Date.now();
    setActiveWorkout({
      id: unfinished.id,
      day: unfinished.type,
      startedAt, // match workout start, timer doesn't reset when leaving app
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
      <ScreenBg image={homeBg} overlay="bg-black/65" blur={3} scale={1} />
      {/* Top gradient — absorbs Telegram header, keeps photo visible */}
      <div className="fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" style={{ zIndex: 0 }} />
      {/* Bottom gradient — grounds the cards */}
      <div className="fixed inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent" style={{ zIndex: 0 }} />

      {/* Content: главная кнопка сверху, четыре кнопки внизу */}
      <div className="relative z-10 flex flex-col min-h-screen safe-top-lg safe-bottom p-5 max-w-lg mx-auto w-full">
        {/* Верх: ARE YOU READY? + главная кнопка (New Workout / Continue) */}
        <div className="shrink-0 flex flex-col gap-4">
          <div className="pt-6 w-full">
            {unfinished && !showDismissConfirm ? (
              <>
                <div className="rounded-xl p-4 w-full" style={{ background: CARD_BG }}>
                  <div className="font-bebas font-light leading-none w-full min-w-0 overflow-hidden flex flex-col items-start gap-0" style={{ fontSize: 'clamp(14px, 7.5vw, 32px)', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                    <span className="text-white/25 shrink-0" style={{ letterSpacing: 'normal', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>ARE YOU</span>
                    <span className="text-white shrink-0" style={{ fontSize: '1.95em', letterSpacing: 'normal', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>READY?</span>
                  </div>
                  <div className="mt-6 w-full flex justify-start">
                    <StatusWidget userId={userId} />
                  </div>
                </div>
                <button
                  onClick={handleContinue}
                  className="card-press w-full rounded-xl py-12 px-4 flex flex-row justify-between items-center mt-8"
                  style={{ background: CARD_BG, fontSize: 'clamp(14px, 7.5vw, 32px)' }}
                >
                  <span className={ICON_WRAPPER}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" style={{ width: '1em', height: '1em' }}>
                      <path d="M5 3l14 9-14 9V3z"/>
                    </svg>
                  </span>
                  <div className="flex flex-col items-end shrink-0 text-right">
                    <span className="font-bebas text-white" style={{ letterSpacing: 'normal' }}>Continue Workout</span>
                    <span className={`font-bebas ${TEXT_MUTED}`} style={{ letterSpacing: 'normal', fontSize: '0.6em' }}>{unfinished.label || unfinished.type?.replace('DAY_', 'Day ') || 'Workout'}</span>
                  </div>
                </button>
                <button
                  onClick={() => setShowDismissConfirm(true)}
                  className="w-full text-center font-bebas text-white/25 py-2 shrink-0"
                  style={{ fontSize: '0.82rem', letterSpacing: '0.08em', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  type="button"
                >
                  Cancel workout
                </button>
                <button
                  onClick={() => setShowDismissConfirm(true)}
                  className="w-full py-12 px-4 flex flex-row justify-between items-center card-press opacity-50 rounded-xl mt-2"
                  style={{ background: CARD_BG, fontSize: 'clamp(14px, 7.5vw, 32px)' }}
                >
                  <span className="shrink-0 flex items-center justify-center text-white/40"><WorkoutIcon style={{ width: '1em', height: '1em' }} /></span>
                  <div className="font-bebas text-white/50 shrink-0" style={{ letterSpacing: 'normal' }}>New Workout</div>
                </button>
              </>
            ) : (
              <div className="rounded-xl p-4 w-full" style={{ background: CARD_BG }}>
                <div className="font-bebas font-light leading-none w-full min-w-0 overflow-hidden flex flex-col items-start gap-0" style={{ fontSize: 'clamp(14px, 7.5vw, 32px)', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                  <span className="text-white/25 shrink-0" style={{ letterSpacing: 'normal', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>ARE YOU</span>
                  <span className="text-white shrink-0" style={{ fontSize: '1.95em', letterSpacing: 'normal', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>READY?</span>
                </div>
                <div className="mt-6 w-full flex justify-start">
                  <StatusWidget userId={userId} />
                </div>
                <button
                  onClick={handleNewWorkout}
                  className="card-press w-full mt-8 py-4 px-4 flex flex-row justify-between items-center rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', fontSize: 'clamp(14px, 7.5vw, 32px)' }}
                >
                  <span className={ICON_WRAPPER}><WorkoutIcon style={{ width: '1em', height: '1em' }} /></span>
                  <div className="font-bebas text-white shrink-0" style={{ letterSpacing: 'normal' }}>New Workout</div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Пустое место */}
        <div 
          className="flex-1 min-h-0" 
          onClick={handleEmptySpaceClick}
        />

        {/* Низ: адаптивная сетка */}
        <div className="shrink-0 pt-4">
          <DragDropGrid 
            items={gridItems}
            onLayoutChange={setGridItems}
            editMode={editMode}
          />
          
          {/* Edit Dashboard */}
          <div className="mt-4 text-center">
            <EditModeToggle 
              enabled={editMode}
              onToggle={() => setEditMode(!editMode)}
            />
          </div>
        </div>
          {unfinished && showDismissConfirm && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/80 backdrop-blur-xl" style={{ WebkitBackdropFilter: 'blur(24px)' }} role="dialog" aria-modal="true">
              <div
                ref={dismissModalRef}
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
      </div>

    </div>
  );
}
