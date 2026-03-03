import { useApp } from '../App';

const ITEMS = [
  { screen: 'workout', icon: '🏋️', iconBg: 'bg-white', title: 'New Workout' },
  { screen: 'history', icon: '📋', iconBg: 'bg-white', title: 'History' },
  { screen: 'stats',   icon: '📊', iconBg: 'bg-white', title: 'Statistics' },
];

export default function HomeScreen() {
  const { navigate } = useApp();

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundImage: 'url(/gym-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Content */}
      <div className="relative z-10 p-5">
        <div className="pt-6 pb-10">
          <h1
            className="font-bebas text-white/85 leading-none w-full"
            style={{ fontSize: '11vw', wordSpacing: '0.6em', letterSpacing: '0.45em' }}
          >
            Are you ready?
          </h1>
        </div>

        <div className="space-y-8">
          {ITEMS.map(item => (
            <button
              key={item.screen}
              onClick={() => navigate(item.screen)}
              className="w-full bg-black/40 backdrop-blur-sm active:bg-black/60 border border-white/10 rounded-2xl p-4 text-left flex items-center gap-4 transition-colors"
            >
              <span className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center text-2xl shrink-0`}>
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
