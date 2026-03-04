import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { CARD_BTN_STYLE } from '../shared';

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
  { screen: 'workout', icon: <WorkoutIcon />, title: 'New Workout', primary: true },
  { screen: 'history', icon: <HistoryIcon />, title: 'History' },
  { screen: 'stats',   icon: <StatsIcon />,   title: 'Statistics' },
];

const PRIMARY_CARD_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 100%) rgba(0,0,0,0.10)',
  border: '1px solid rgba(255,255,255,0.38)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.40), 0 0 28px rgba(255,255,255,0.12), 0 0 8px rgba(255,255,255,0.07)',
};

function daysAgoLabel(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return dateStr.split('-').slice(1).reverse().join('.');
}

function StatusWidget({ userId }) {
  const [stats, setStats] = useState(undefined); // undefined = loading

  useEffect(() => {
    Promise.all([
      api.getHistory(userId, 0, 1),
      api.getStats(userId, 7),
      api.getFrequency(userId),
    ]).then(([hist, week, freq]) => {
      setStats({
        lastDate: hist.items?.[0]?.date ?? null,
        weekCount: week.total ?? 0,
        total: freq.total ?? 0,
      });
    }).catch(() => setStats(null));
  }, [userId]);

  if (stats === undefined) return <div className="mt-4 h-9" />;
  if (!stats) return null;

  const { lastDate, weekCount, total } = stats;
  const parts = [
    `${total} workout${total !== 1 ? 's' : ''}`,
    `Last: ${lastDate ? daysAgoLabel(lastDate) : '—'}`,
    `${weekCount} this week`,
  ];

  return (
    <div className="mt-3 flex items-center">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span className="mx-2 text-white/20 text-xs">·</span>}
          <span className="font-bebas tracking-wider text-white/55 text-sm">{p}</span>
        </span>
      ))}
    </div>
  );
}

export default function HomeScreen() {
  const { navigate, userId } = useApp();

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
      {/* Bottom gradient — grounds the cards */}
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Content: title top, cards bottom */}
      <div className="relative z-10 flex flex-col min-h-screen p-5">
        {/* Headline */}
        <div className="pt-2">
          <div className="font-bebas leading-none w-full">
            <div style={{ fontSize: '9vw', letterSpacing: '0.32em', wordSpacing: '0.5em', color: 'rgba(255,255,255,0.75)' }}>Are you</div>
            <div style={{ fontSize: '18vw', letterSpacing: '0.36em', color: 'rgba(255,255,255,1)' }}>Ready<span style={{ letterSpacing: 0, marginLeft: '-0.36em' }}>?</span></div>
          </div>
        </div>

        {/* Status widget */}
        <StatusWidget userId={userId} />

        {/* Push cards to bottom */}
        <div className="flex-1" />

        {/* Navigation cards */}
        <div className="space-y-3 pb-14">
          {ITEMS.map(item => (
            <button
              key={item.screen}
              onClick={() => navigate(item.screen)}
              className="card-press w-full rounded-2xl p-4 text-left flex items-center gap-4"
              style={item.primary ? PRIMARY_CARD_STYLE : CARD_BTN_STYLE}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color: item.primary ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.82)' }}>
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`font-bebas tracking-wider text-lg ${item.primary ? 'text-white' : 'text-white/85'}`}>{item.title}</div>
              </div>
              <span className={`text-xl shrink-0 ${item.primary ? 'text-white/50' : 'text-white/35'}`}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
