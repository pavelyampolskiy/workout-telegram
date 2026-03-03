import { useApp } from '../App';

const DayAIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

const DayBIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M5 6h14M7 12h10M9 18h6"/>
  </svg>
);

const DayCIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="4"/>
    <line x1="12" y1="2" x2="12" y2="8"/>
    <line x1="12" y1="16" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="8" y2="12"/>
    <line x1="16" y1="12" x2="22" y2="12"/>
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
