import { useApp } from '../App';

const OPTIONS = [
  { key: 'DAY_A', label: 'Day A', letter: 'A', color: 'bg-white', desc: 'Legs · Back · Chest · Biceps · Triceps · Shoulders' },
  { key: 'DAY_B', label: 'Day B', letter: 'B', color: 'bg-white', desc: 'Legs · Back · Chest · Biceps · Triceps · Shoulders' },
  { key: 'DAY_C', label: 'Day C', letter: 'C', color: 'bg-white', desc: 'Legs · Back · Chest · Biceps · Triceps · Shoulders' },
  { key: 'CARDIO', label: 'Cardio', letter: '❤️', color: 'bg-white', desc: 'Running, cycling, rowing…' },
];

export default function WorkoutScreen() {
  const { navigate } = useApp();

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold mb-6 pt-2 font-bebas tracking-wider">New Workout</h1>
      <div className="space-y-3">
        {OPTIONS.map(o => (
          <button
            key={o.key}
            onClick={() => navigate(o.key === 'CARDIO' ? 'cardio' : 'day', { day: o.key })}
            className="w-full bg-white/10 backdrop-blur-sm active:bg-white/20 border border-white/10 rounded-2xl p-4 text-left flex items-center gap-4 transition-colors"
          >
            <span className={`w-10 h-10 rounded-xl ${o.color} flex items-center justify-center text-black font-bold text-lg shrink-0`}>
              {o.letter}
            </span>
            <div className="min-w-0">
              <div className="font-bebas tracking-wider text-lg text-slate-100">{o.label}</div>
              <div className="text-slate-400 text-xs mt-0.5 truncate">{o.desc}</div>
            </div>
            <span className="ml-auto text-slate-500 text-xl shrink-0">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
