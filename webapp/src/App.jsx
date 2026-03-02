import { useState, createContext, useContext, useEffect, useCallback } from 'react';

import HomeScreen from './screens/HomeScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import DayScreen from './screens/DayScreen';
import ExerciseScreen from './screens/ExerciseScreen';
import CardioScreen from './screens/CardioScreen';
import HistoryScreen from './screens/HistoryScreen';
import HistoryDetailScreen from './screens/HistoryDetailScreen';
import StatsScreen from './screens/StatsScreen';
import ProgressScreen from './screens/ProgressScreen';

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
};

export default function App() {
  const [stack, setStack] = useState([{ screen: 'home', params: {} }]);
  const [userId, setUserId] = useState(null);
  // Shared active workout state so DayScreen survives ExerciseScreen navigation
  const [activeWorkout, setActiveWorkout] = useState(null);

  const current = stack[stack.length - 1];
  const Screen = SCREENS[current.screen] || HomeScreen;

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      const uid = tg.initDataUnsafe?.user?.id;
      setUserId(uid || 0);
    } else {
      // Fallback for browser testing
      setUserId(parseInt(localStorage.getItem('test_uid') || '1'));
    }
  }, []);

  const navigate = useCallback((screen, params = {}) => {
    setStack(prev => [...prev, { screen, params }]);
  }, []);

  const goBack = useCallback(() => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const resetTo = useCallback((screen = 'home', params = {}) => {
    setStack([{ screen, params }]);
    setActiveWorkout(null);
  }, []);

  // Telegram native back button
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    if (stack.length > 1) {
      tg.BackButton.show();
    } else {
      tg.BackButton.hide();
    }
    const handler = () => goBack();
    tg.BackButton.onClick(handler);
    return () => tg.BackButton.offClick(handler);
  }, [stack.length, goBack]);

  if (userId === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <AppCtx.Provider
      value={{
        userId,
        navigate,
        goBack,
        resetTo,
        params: current.params,
        activeWorkout,
        setActiveWorkout,
      }}
    >
      <div className="min-h-screen bg-slate-900 text-slate-100 max-w-lg mx-auto">
        <Screen />
      </div>
    </AppCtx.Provider>
  );
}
