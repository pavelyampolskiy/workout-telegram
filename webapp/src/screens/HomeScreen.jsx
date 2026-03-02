import { useApp } from '../App';

export default function HomeScreen() {
  const { navigate } = useApp();

  return (
    <div className="p-5">
      <div className="pt-4 pb-6">
        <h1 className="text-3xl font-bold text-slate-100">Hey, pussy! 💪</h1>
        <p className="text-slate-400 text-sm mt-1">What's the plan today?</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => navigate('workout')}
          className="w-full bg-blue-600 active:bg-blue-700 rounded-2xl p-5 text-left flex items-center gap-4 transition-colors"
        >
          <span className="text-4xl">🆕</span>
          <div>
            <div className="font-bold text-lg text-white">New Workout</div>
            <div className="text-blue-200 text-sm">Start Day A, B, C or Cardio</div>
          </div>
          <span className="ml-auto text-blue-300 text-xl">›</span>
        </button>

        <button
          onClick={() => navigate('history')}
          className="w-full bg-slate-800 active:bg-slate-700 rounded-2xl p-5 text-left flex items-center gap-4 transition-colors"
        >
          <span className="text-4xl">📋</span>
          <div>
            <div className="font-bold text-lg">History</div>
            <div className="text-slate-400 text-sm">View past workouts</div>
          </div>
          <span className="ml-auto text-slate-500 text-xl">›</span>
        </button>

        <button
          onClick={() => navigate('stats')}
          className="w-full bg-slate-800 active:bg-slate-700 rounded-2xl p-5 text-left flex items-center gap-4 transition-colors"
        >
          <span className="text-4xl">📈</span>
          <div>
            <div className="font-bold text-lg">Statistics</div>
            <div className="text-slate-400 text-sm">Progress & frequency</div>
          </div>
          <span className="ml-auto text-slate-500 text-xl">›</span>
        </button>
      </div>
    </div>
  );
}
