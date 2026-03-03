import { useApp } from '../App';

const DayAIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

const DayBIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="4.5"/>
  </svg>
);

const DayCIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="15" r="6"/>
    <path d="M9 9h6"/>
    <path d="M9 9c0-2 1-3.5 3-3.5s3 1.5 3 3.5"/>
  </svg>
);

const CardioIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="2,12 6,12 8,6 10,18 12,12 14,12 16,9 18,12 22,12"/>
  </svg>
);

const OPTIONS = [
  { key: 'DAY_A', label: 'Day A', icon: <DayAIcon /> },
  { key: 'DAY_B', label: 'Day B', icon: <DayBIcon /> },
  { key: 'DAY_C', label: 'Day C', icon: <DayCIcon /> },
  { key: 'CARDIO', label: 'Cardio', icon: <CardioIcon /> },
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
            <span className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center text-white shrink-0">
              {o.icon}
            </span>
            <div className="min-w-0">
              <div className="font-bebas tracking-wider text-lg text-slate-100">{o.label}</div>
            </div>
            <span className="ml-auto text-slate-500 text-xl shrink-0">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
