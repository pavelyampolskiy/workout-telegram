import { useState, useEffect } from 'react';
import { api } from '../api';

const RestTimerWidget = () => {
  const [restState, setRestState] = useState(null);

  useEffect(() => {
    const loadLastWorkout = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      try {
        // Get last workout from API
        const data = await api.getHistory(userId, 0, 1); // Get only the most recent workout
        if (!data.items || data.items.length === 0) return;

        const lastWorkout = data.items[0];
        const lastWorkoutTime = new Date(lastWorkout.date + 'T' + (lastWorkout.completed_at || '00:00:00'));
        const now = new Date();
        const hoursDiff = (now - lastWorkoutTime) / (1000 * 60 * 60);

        // Determine rest state based on hours since last workout
        let state;
        if (hoursDiff < 6) {
          state = {
            type: 'recovering',
            icon: '⚡',
            text: `Recovering — trained ${Math.round(hoursDiff)}h ago`,
            subtext: getWorkoutDisplayName(lastWorkout),
            color: 'text-yellow-400'
          };
        } else if (hoursDiff < 24) {
          state = {
            type: 'resting',
            icon: '⏱️',
            text: `Resting — ${Math.round(hoursDiff)}h since last workout`,
            subtext: getWorkoutDisplayName(lastWorkout),
            color: 'text-blue-400'
          };
        } else if (hoursDiff < 48) {
          state = {
            type: 'ready',
            icon: '✅',
            text: `Ready to train — ${Math.round(hoursDiff)}h recovered`,
            subtext: getNextWorkout(lastWorkout),
            color: 'text-green-400'
          };
        } else if (hoursDiff < 72) {
          state = {
            type: 'fully-recovered',
            icon: '✅',
            text: `Fully recovered — ${Math.round(hoursDiff / 24)} days rest`,
            subtext: `Don't lose momentum! ${getNextWorkout(lastWorkout)}`,
            color: 'text-green-400'
          };
        } else {
          state = {
            type: 'warning',
            icon: '⚠️',
            text: `${Math.round(hoursDiff / 24)} days without training`,
            subtext: `Don't lose momentum! ${getNextWorkout(lastWorkout)}`,
            color: 'text-orange-400'
          };
        }

        setRestState(state);
      } catch (e) {
        console.error('Error loading rest timer data:', e);
      }
    };

    loadLastWorkout();
  }, []);

  // Get display name for workout
  const getWorkoutDisplayName = (workout) => {
    if (workout.type === 'CARDIO') {
      return 'Cardio';
    }
    return workout.type || 'Workout';
  };

  // Get next workout based on last workout
  const getNextWorkout = (lastWorkout) => {
    if (lastWorkout.type === 'CARDIO') {
      return 'Day A';
    }
    
    const workoutTypes = ['DAY_A', 'DAY_B', 'DAY_C'];
    const currentIndex = workoutTypes.indexOf(lastWorkout.type);
    const nextIndex = (currentIndex + 1) % workoutTypes.length;
    return workoutTypes[nextIndex].replace('_', ' ');
  };

  if (!restState) return null; // Don't show widget if no workout data

  return (
    <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
      {/* Left: Icon + color indicator */}
      <div className="flex items-center gap-3">
        <div className={`text-2xl ${restState.color}`}>
          {restState.icon}
        </div>
        <div className={`w-2 h-2 rounded-full ${restState.color.replace('text', 'bg')}`} />
      </div>

      {/* Center: Main text + subtext */}
      <div className="flex-1 mx-4 text-center">
        <div className="text-white font-bebas tracking-wider text-sm">
          {restState.text}
        </div>
        <div className="text-white/60 text-xs mt-1">
          {restState.subtext}
        </div>
      </div>

      {/* Right: Timer display */}
      <div className="text-white/40 text-xs font-bebas tracking-wider">
        {new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })}
      </div>
    </div>
  );
};

export default RestTimerWidget;
