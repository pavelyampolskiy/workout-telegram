import { useState, createContext, useContext, useEffect, useCallback, useRef, Component } from 'react';
import { useSwipeBack } from './hooks/useSwipeBack';
import { Toast } from './components/Toast';

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
            onClick={() => this.setState({ error: null })}
            className="card-press text-white/90 font-bebas tracking-wider px-8 py-3 rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.10)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 0 18px rgba(255,255,255,0.06)' }}
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
  const [activeWorkout, setActiveWorkout] = useState(() => {
    try {
      const s = localStorage.getItem('activeWorkout');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [recoveryData, setRecoveryData] = useState(null); // { score, modifier, timestamp }
  const [direction, setDirection] = useState('none'); // 'forward', 'back', 'none'
  const [isAnimating, setIsAnimating] = useState(false);
  const [toast, setToast] = useState(null);
  const prevStackLength = useRef(1);

  const showToast = useCallback((msg) => setToast(msg), []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (activeWorkout) {
      localStorage.setItem('activeWorkout', JSON.stringify(activeWorkout));
    } else {
      localStorage.removeItem('activeWorkout');
    }
  }, [activeWorkout]);

  const current = stack[stack.length - 1];
  const Screen = SCREENS[current.screen] || HomeScreen;

  // Track navigation direction
  useEffect(() => {
    if (stack.length > prevStackLength.current) {
      setDirection('forward');
      setIsAnimating(true);
    } else if (stack.length < prevStackLength.current) {
      setDirection('back');
      setIsAnimating(true);
    }
    prevStackLength.current = stack.length;
    
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [stack.length]);

  useEffect(() => {
    const onTouch = (e) => {
      const el = e.target.closest('button, [role="button"], .card-press');
      if (el) {
        try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch (_) {}
        el.classList.remove('btn-flash');
        void el.offsetWidth; // reflow to restart animation if pressed again quickly
        el.classList.add('btn-flash');
        setTimeout(() => el.classList.remove('btn-flash'), 380);
      }
    };
    document.addEventListener('touchstart', onTouch, { passive: true });
    return () => document.removeEventListener('touchstart', onTouch);
  }, []);

  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        try { tg.expand(); } catch (_) {}
        try { tg.requestFullscreen(); } catch (_) {}
        try { tg.setHeaderColor('#000000'); } catch (_) {}
        try { tg.setBackgroundColor('#000000'); } catch (_) {}

        const applyInsets = () => {
          const saTop = tg.safeAreaInsets?.top ?? 0;
          const csaTop = tg.contentSafeAreaInsets?.top ?? 0;
          document.documentElement.style.setProperty('--tg-sa-top', `${saTop}px`);
          document.documentElement.style.setProperty('--tg-csa-top', csaTop > 0 ? `${csaTop}px` : '44px');
          const vh = tg.viewportStableHeight || window.innerHeight;
          document.documentElement.style.setProperty('--tg-vh', `${vh}px`);
        };
        applyInsets();
        setTimeout(applyInsets, 300);
        setTimeout(applyInsets, 1000);
        try { tg.onEvent('safeAreaChanged', applyInsets); } catch (_) {}
        try { tg.onEvent('contentSafeAreaChanged', applyInsets); } catch (_) {}
        try { tg.onEvent('viewportChanged', applyInsets); } catch (_) {}
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

  const navigate = useCallback((screen, params = {}) => {
    setStack(prev => [...prev, { screen, params }]);
  }, []);

  const replace = useCallback((screen, params = {}) => {
    setStack(prev => [...prev.slice(0, -1), { screen, params }]);
  }, []);

  const goBack = useCallback(() => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const resetTo = useCallback((screen = 'home', params = {}) => {
    setStack([{ screen, params }]);
    setActiveWorkout(null);
  }, []);

  // Show/hide Telegram native back button to preserve viewport height on inner screens
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
      <div className="bg-black text-white max-w-lg mx-auto overflow-hidden" style={{ height: 'var(--tg-vh, 100vh)' }}>
        <Toast message={toast} onClose={dismissToast} visible={!!toast} />
        <div
          key={current.screen}
          className={`bg-black overflow-hidden ${
            isAnimating
              ? direction === 'forward'
                ? 'animate-slide-in-right'
                : 'animate-slide-in-left'
              : ''
          }`}
          style={{ height: 'var(--tg-vh, 100vh)', paddingTop: 'calc(max(var(--tg-sa-top, 0px), env(safe-area-inset-top, 0px)) + var(--tg-csa-top, 0px))' }}
        >
          <ErrorBoundary>
            <Screen />
          </ErrorBoundary>
        </div>
      </div>
    </AppCtx.Provider>
  );
}
