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
      {/* Blurred background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/gym-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(1.5px)',
          transform: 'scale(1.02)',
        }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Top gradient — deepens header zone */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-black/60 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-5">
        <div className="pt-6 pb-10">
          <div className="font-bebas leading-none w-full">
            <div style={{ fontSize: '9vw', letterSpacing: '0.45em', wordSpacing: '0.6em', color: 'rgba(255,255,255,0.83)' }}>Are you</div>
            <div style={{ fontSize: '14vw', letterSpacing: '0.52em', color: 'rgba(255,255,255,0.91)' }}>Ready?</div>
          </div>
        </div>

        <div className="space-y-16">
          {ITEMS.map(item => (
            <button
              key={item.screen}
              onClick={() => navigate(item.screen)}
              className="card-press w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-left flex items-center gap-4 shadow-[0_0_20px_rgba(255,255,255,0.12)]"
            >
              <span className="w-12 h-12 rounded-xl border border-white/20 flex items-center justify-center text-white shrink-0">
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
