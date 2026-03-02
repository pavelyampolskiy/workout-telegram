import { useApp } from '../App';

const OPTIONS = [
  { key: 'DAY_A', label: 'Day A', emoji: '🅰️', desc: 'Legs · Back · Chest · Biceps · Triceps · Shoulders' },
  { key: 'DAY_B', label: 'Day B', emoji: '🅱️', desc: 'Legs · Back · Chest · Biceps · Triceps · Shoulders' },
  { key: 'DAY_C', label: 'Day C', emoji: '🇨', desc: 'Legs · Back · Chest · Biceps · Triceps · Shoulders' },
  { key: 'CARDIO', label: 'Cardio', emoji: '❤️', desc: 'Running, cycling, rowing…' },
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
            <span className="text-3xl w-10 text-center shrink-0">{o.emoji}</span>
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
