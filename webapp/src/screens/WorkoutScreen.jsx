import { useApp } from '../App';
import ScreenBg from '../ScreenBg';
import { CARD_BTN_STYLE } from '../shared';

const DayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

const CardioIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="2,12 6,12 8,6 10,18 12,12 14,12 16,9 18,12 22,12"/>
  </svg>
);

const OPTIONS = [
  { key: 'DAY_A', label: 'Day A', icon: <DayIcon /> },
  { key: 'DAY_B', label: 'Day B', icon: <DayIcon /> },
  { key: 'DAY_C', label: 'Day C', icon: <DayIcon /> },
  { key: 'CARDIO', label: 'Cardio', icon: <CardioIcon /> },
];

export default function WorkoutScreen() {
  const { navigate } = useApp();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg overlay="bg-black/60" />
      <div className="relative z-10 p-5">
        <h1 className="text-xl mb-6 pt-2 font-bebas tracking-wider">New Workout</h1>
        <div className="space-y-9">
          {OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => navigate(o.key === 'CARDIO' ? 'cardio' : 'day', { day: o.key })}
              className="card-press w-full rounded-2xl p-4 text-left flex items-center gap-4"
              style={CARD_BTN_STYLE}
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
