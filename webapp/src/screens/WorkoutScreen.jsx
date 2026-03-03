import { useApp } from '../App';

const DayAIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

const DayBIcon = DayAIcon;
const DayCIcon = DayAIcon;

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
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 scale-110" style={{ backgroundImage: 'url(/workout-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }} />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 p-5">
        <h1 className="text-xl mb-6 pt-2 font-bebas tracking-wider">New Workout</h1>
        <div className="space-y-9">
          {OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => navigate(o.key === 'CARDIO' ? 'cardio' : 'day', { day: o.key })}
              className="card-press w-full rounded-2xl p-4 text-left flex items-center gap-4"
              style={{ background: 'rgba(0,0,0,0.10)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 0 18px rgba(255,255,255,0.06), 0 0 6px rgba(255,255,255,0.04)' }}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color: 'rgba(255,255,255,0.82)' }}>
                {o.icon}
              </span>
              <div className="min-w-0">
                <div className="font-bebas tracking-wider text-lg text-white">{o.label}</div>
              </div>
              <span className="ml-auto text-white/35 text-xl shrink-0">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
