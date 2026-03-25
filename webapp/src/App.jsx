import { useState, createContext, useContext, useEffect, useCallback, useRef, Component } from 'react';
import { useSwipeBack } from './hooks/useSwipeBack';
import { Toast } from './components/Toast';
import { api } from './api';

import HomeScreen from './screens/HomeScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import DayScreen from './screens/DayScreen';
import ExerciseScreen from './screens/ExerciseScreen';
import CardioScreen from './screens/CardioScreen';
import HistoryScreen from './screens/HistoryScreen';
import HistoryDetailScreen from './screens/HistoryDetailScreen';
import StatsScreen from './screens/StatsScreen';
import ProgressScreen from './screens/ProgressScreen';
import AchievementsScreen from './screens/AchievementsScreen';
import RecoveryCheckScreen from './screens/RecoveryCheckScreen';
import ProgramScreen from './screens/ProgramScreen';
import ProgramDayScreen from './screens/ProgramDayScreen';
import SupplementsScreen from './screens/SupplementsScreen';
import MetricsScreen from './screens/MetricsScreen';
import BackdateWorkoutScreen from './screens/BackdateWorkoutScreen';
import AICoachScreen from './screens/AICoachScreen';
import FigmaScreen from './screens/FigmaScreen';
import TDEEScreen from './screens/TDEEScreen';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const SCREENS = {
  home: HomeScreen,
  workout: WorkoutScreen,
  day: DayScreen,
  exercise: ExerciseScreen,
  cardio: CardioScreen,
  history: HistoryScreen,
  'history-detail': HistoryDetailScreen,
  stats: StatsScreen,
  progress: ProgressScreen,
  achievements: AchievementsScreen,
  'recovery-check': RecoveryCheckScreen,
  program: ProgramScreen,
  'program-day': ProgramDayScreen,
  supplements: SupplementsScreen,
  metrics: MetricsScreen,
  'backdate-workout': BackdateWorkoutScreen,
  'ai-coach': AICoachScreen,
  figma: FigmaScreen,
  tdee: TDEEScreen,
};

// Error boundary to catch rendering errors instead of blank screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error: error?.message || String(error) };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-red-400 font-bebas tracking-wider text-lg mb-2">Something went wrong</div>
          <div className="text-white/30 text-xs mb-6 font-bebas tracking-wider">{this.state.error}</div>
          <button
            onClick={() => {
              this.setState({ error: null });
              this.props.onRetry?.();
            }}
            className="card-press text-white/90 font-bebas tracking-wider px-8 py-3 rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 0 18px rgba(255,255,255,0.06)' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [stack, setStack] = useState([{ screen: 'home', params: {} }]);
  const [userId, setUserId] = useState(null);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [recoveryData, setRecoveryData] = useState(null); // { score, modifier, timestamp }
  const [toast, setToast] = useState(null);
  const [countdown, setCountdown] = useState(null); // { step, targetScreen, targetParams }

  const showToast = useCallback((msg) => setToast(msg), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const current = stack[stack.length - 1];
  const isDayCardio = current.screen === 'day' && current.params?.day && String(current.params.day).toUpperCase() === 'CARDIO';
  const Screen = isDayCardio ? SCREENS.cardio : (SCREENS[current.screen] || HomeScreen);

  useEffect(() => {
    setToast(null);
  }, [stack]);

  // Виброотклик при нажатии на любую кнопку
  useEffect(() => {
    const triggerHaptic = () => {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      } catch (_) {}
    };
    const onDocClick = (e) => {
      const el = e.target?.closest?.('button, [role="button"], .card-press');
      if (el) triggerHaptic();
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, []);

  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        // DPPoI: respect user/device preference, only expand to available height.
        const doExpand = () => { try { tg.expand(); } catch (_) {} };
        doExpand();
        try { tg.setHeaderColor('#000000'); } catch (_) {}
        try { tg.setBackgroundColor('#000000'); } catch (_) {}
        // On viewport change (rotation, keyboard), just re‑expand instead of forcing fullscreen.
        try { tg.onEvent('viewportChanged', () => { doExpand(); }); } catch (_) {}
        const uid = tg.initDataUnsafe?.user?.id;
        if (uid) {
          setUserId(Number(uid));
        } else {
          // Generate unique negative ID for non-Telegram users
          let localId = localStorage.getItem('local_user_id');
          if (!localId) {
            localId = String(-Math.floor(Date.now() / 1000));
            localStorage.setItem('local_user_id', localId);
          }
          setUserId(parseInt(localId));
        }
      } else {
        // PWA or browser mode
        let localId = localStorage.getItem('local_user_id');
        if (!localId) {
          localId = String(-Math.floor(Date.now() / 1000));
          localStorage.setItem('local_user_id', localId);
        }
        setUserId(parseInt(localId));
      }
    } catch (e) {
      setUserId(-1);
    }
  }, []);

  // Save/restore activeWorkout from localStorage for persistence
  useEffect(() => {
    if (!userId) return;
    
    // Load active workout from localStorage
    try {
      const saved = localStorage.getItem(`activeWorkout_${userId}`);
      if (saved) {
        const workout = JSON.parse(saved);
        // Verify it's still valid by checking with backend
        api.getUnfinishedWorkout(userId).then(data => {
          if (data.workout && data.workout.id === workout.id) {
            setActiveWorkout(workout);
          } else {
            // Clear invalid saved workout
            localStorage.removeItem(`activeWorkout_${userId}`);
          }
        }).catch(() => {
          localStorage.removeItem(`activeWorkout_${userId}`);
        });
      }
    } catch (e) {
      localStorage.removeItem(`activeWorkout_${userId}`);
    }
  }, [userId]);

  // Save activeWorkout to localStorage whenever it changes
  useEffect(() => {
    if (!userId || !activeWorkout) return;
    try {
      localStorage.setItem(`activeWorkout_${userId}`, JSON.stringify(activeWorkout));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [userId, activeWorkout]);

  // Request fullscreen on first tap so background is full-screen on all screens (Home, Cardio, etc.)
  const fullscreenRequested = useRef(false);
  const requestFullscreenOnTap = useCallback(() => {
    if (fullscreenRequested.current) return;
    fullscreenRequested.current = true;
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        try { tg.expand(); } catch (_) {}
        if (typeof tg.requestFullscreen === 'function') {
          try { tg.requestFullscreen(); } catch (_) {}
        }
      }
    } catch (_) {}
  }, []);

  const navigate = useCallback((screen, params = {}) => {
    if (screen === 'day' && params?.day != null && String(params.day).toUpperCase() === 'CARDIO') {
      setStack(prev => [...prev, { screen: 'cardio', params: {} }]);
      return;
    }
    setStack(prev => [...prev, { screen, params }]);
  }, []);

  const replace = useCallback((screen, params = {}) => {
    if (screen === 'day' && params?.day != null && String(params.day).toUpperCase() === 'CARDIO') {
      setStack(prev => [...prev.slice(0, -1), { screen: 'cardio', params: {} }]);
      return;
    }
    setStack(prev => [...prev.slice(0, -1), { screen, params }]);
  }, []);

  // Pre-workout countdown (Nike-style "Ready? 1 2 3 Go!")
  const startWorkoutCountdown = useCallback((screen, params = {}) => {
    setCountdown({ step: 0, targetScreen: screen, targetParams: params });
  }, []);

  useEffect(() => {
    if (!countdown) return;

    const STEPS = ['Ready?', '1', '2', '3', 'Go!'];

    // When countdown finished — navigate to target screen
    if (countdown.step >= STEPS.length) {
      const { targetScreen, targetParams } = countdown;
      setCountdown(null);
      navigate(targetScreen, targetParams);
      return;
    }

    // Haptic feedback for each tick
    try {
      const style =
        countdown.step === 0
          ? 'light'
          : countdown.step === STEPS.length - 1
          ? 'heavy'
          : 'medium';
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    } catch (_) {}

    const delay = countdown.step === 0 ? 700 : 650;
    const t = setTimeout(() => {
      setCountdown(prev => (prev ? { ...prev, step: prev.step + 1 } : prev));
    }, delay);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  // As soon as we have day+CARDIO in stack, replace with cardio so ADD EXERCISE screen never shows
  useEffect(() => {
    const top = stack[stack.length - 1];
    if (top?.screen === 'day' && top?.params?.day != null && String(top.params.day).toUpperCase() === 'CARDIO') {
      replace('cardio');
    }
  }, [stack, replace]);

  const goBack = useCallback(() => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const resetTo = useCallback((screen = 'home', params = {}) => {
    // Clear active workout from localStorage when resetting
    if (userId) {
      localStorage.removeItem(`activeWorkout_${userId}`);
    }
    setStack([{ screen, params }]);
    setActiveWorkout(null);
  }, [userId]);

  // Telegram native back button — defensive
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg?.BackButton) return;
      if (stack.length > 1) {
        tg.BackButton.show();
      } else {
        tg.BackButton.hide();
      }
      const handler = () => goBack();
      tg.BackButton.onClick(handler);
      return () => { try { tg.BackButton.offClick(handler); } catch (_) {} };
    } catch (_) {}
  }, [stack.length, goBack]);

  // Swipe-back gesture (swipe from left edge to go back)
  useSwipeBack(goBack, stack.length > 1);

  if (userId === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/40 font-bebas tracking-wider">
        Loading…
      </div>
    );
  }

  return (
    <AppCtx.Provider
      value={{
        userId,
        navigate,
        replace,
        startWorkoutCountdown,
        goBack,
        resetTo,
        params: current.params,
        activeWorkout,
        setActiveWorkout,
        recoveryData,
        setRecoveryData,
        showToast,
      }}
    >
      <div className="min-h-screen text-white max-w-lg mx-auto overflow-hidden relative z-[1]" onClick={requestFullscreenOnTap} data-build="cardio-fix-v2">
        <Toast message={toast} onClose={dismissToast} visible={!!toast} />
        <div key={current.screen} className="min-h-screen relative">
          <ErrorBoundary onRetry={() => resetTo('home')}>
            <Screen />
          </ErrorBoundary>
        </div>
        {countdown && (() => {
          const labels = ['READY?', '1', '2', '3', 'GO!'];
          const label = labels[Math.min(countdown.step, 4)];
          const isWord = label.length > 1;
          return (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none">
              <div className="relative">
                <div
                  key={label}
                  className={`relative font-bebas leading-none text-white text-center countdown-zoom ${
                    isWord ? 'text-[96px] tracking-[0.14em]' : 'text-[144px] tracking-[0.20em]'
                  }`}
                >
                  {label}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </AppCtx.Provider>
  );
}
