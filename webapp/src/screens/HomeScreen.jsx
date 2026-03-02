import { useApp } from '../App';

const ITEMS = [
  {
    screen: 'workout',
    icon: '🏋️',
    iconBg: 'bg-blue-600',
    title: 'New Workout',
    sub: 'Start Day A, B, C or Cardio',
    accent: 'text-blue-300',
  },
  {
    screen: 'history',
    icon: '📋',
    iconBg: 'bg-slate-600',
    title: 'History',
    sub: 'View past workouts',
    accent: 'text-slate-400',
  },
  {
    screen: 'stats',
    icon: '📊',
    iconBg: 'bg-slate-600',
    title: 'Statistics',
    sub: 'Progress & frequency',
    accent: 'text-slate-400',
  },
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
        <div className="pt-6 pb-8">
          <h1 className="text-3xl font-extrabold text-white leading-tight font-bebas tracking-wider">Hey, pussy! 💪</h1>
          <p className="text-slate-300 text-sm mt-1">Are you ready?</p>
        </div>

        <div className="space-y-3">
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
                <div className="font-bold text-white">{item.title}</div>
                <div className={`text-xs mt-0.5 ${item.accent}`}>{item.sub}</div>
              </div>
              <span className="text-white/40 text-xl shrink-0">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
