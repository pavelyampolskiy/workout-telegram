import { useApp } from '../App';

const WorkoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M6.5 12h11M4 9.5h2.5v5H4zM17.5 9.5H20v5h-2.5zM2 10.5h2v3H2zM20 10.5h2v3h-2z"/>
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3.5 3.5"/>
  </svg>
);

const StatsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M4 20V12M8 20V16M12 20V8M16 20V14M20 20V4"/>
  </svg>
);

const ITEMS = [
  { screen: 'workout', icon: <WorkoutIcon />, title: 'New Workout' },
  { screen: 'history', icon: <HistoryIcon />, title: 'History' },
  { screen: 'stats',   icon: <StatsIcon />,   title: 'Statistics' },
];

export default function HomeScreen() {
  const { navigate } = useApp();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blurred background */}
      <div
        className="absolute inset-0 scale-110"
        style={{ backgroundImage: 'url(/gym-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/65" />
      {/* Top gradient — absorbs Telegram header */}
      <div className="absolute inset-x-0 top-0 h-32 bg-black/90" />
      <div className="absolute inset-x-0 top-32 h-24 bg-gradient-to-b from-black/90 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-5">
        <div className="pt-2 pb-8">
          <div className="font-bebas leading-none w-full">
            <div style={{ fontSize: '9vw', letterSpacing: '0.32em', wordSpacing: '0.5em', color: 'rgba(255,255,255,0.75)' }}>Are you</div>
            <div style={{ fontSize: '18vw', letterSpacing: '0.36em', color: 'rgba(255,255,255,1)' }}>Ready?</div>
          </div>
        </div>

        <div className="space-y-16">
          {ITEMS.map(item => (
            <button
              key={item.screen}
              onClick={() => navigate(item.screen)}
              className="card-press w-full backdrop-blur-sm rounded-2xl p-4 text-left flex items-center gap-4"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.14)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 0 18px rgba(255,255,255,0.07), 0 0 6px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ color: 'rgba(255,255,255,0.82)' }}>
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bebas tracking-wider text-lg text-white">{item.title}</div>
              </div>
              <span className="text-white/40 text-xl shrink-0">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
