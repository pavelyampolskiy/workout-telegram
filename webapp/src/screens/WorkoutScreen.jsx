import { useApp } from '../App';

const OPTIONS = [
  { key: 'DAY_A', label: 'Day A', letter: 'A', color: 'bg-blue-500', desc: 'Legs · Back · Chest · Biceps · Triceps · Shoulders' },
  { key: 'DAY_B', label: 'Day B', letter: 'B', color: 'bg-purple-500', desc: 'Legs · Back · Chest · Biceps · Triceps · Shoulders' },
  { key: 'DAY_C', label: 'Day C', letter: 'C', color: 'bg-green-500', desc: 'Legs · Back · Chest · Biceps · Triceps · Shoulders' },
  { key: 'CARDIO', label: 'Cardio', letter: '❤️', color: 'bg-red-900/50', desc: 'Running, cycling, rowing…' },
];

export default function WorkoutScreen() {
  const { navigate } = useApp();

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold mb-6 pt-2">New Workout</h1>
      <div className="space-y-3">
        {OPTIONS.map(o => (
          <button
            key={o.key}
            onClick={() => navigate(o.key === 'CARDIO' ? 'cardio' : 'day', { day: o.key })}
            className="w-full bg-slate-800 active:bg-slate-700 rounded-2xl p-4 text-left flex items-center gap-4 transition-colors"
          >
            <span className={`w-10 h-10 rounded-xl ${o.color} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
              {o.letter}
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-slate-100">{o.label}</div>
              <div className="text-slate-400 text-xs mt-0.5 truncate">{o.desc}</div>
            </div>
            <span className="ml-auto text-slate-500 text-xl shrink-0">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
