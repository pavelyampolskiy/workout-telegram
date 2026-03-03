import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

const CARD = {
  className: 'bg-black/40 backdrop-blur-sm rounded-2xl p-5',
  style: { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' },
};

function Bar({ value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full bg-white/75 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-mono text-white/70 w-4 text-right">{value}</span>
    </div>
  );
}

export default function StatsScreen() {
  const { userId, navigate } = useApp();
  const [tab, setTab] = useState('week');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [week, month, freq] = await Promise.all([
          api.getStats(userId, 7),
          api.getStats(userId, 30),
          api.getFrequency(userId),
        ]);
        setData({ week, month, freq });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-white/40">Loading…</div>;
  }
  if (error) {
    return <div className="p-5 text-center text-white/40 pt-20">{error}</div>;
  }

  const TABS = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'freq', label: 'Frequency' },
    { key: 'progress', label: 'Progress' },
  ];

  const renderContent = () => {
    if (tab === 'progress') {
      return (
        <div className="text-center py-8">
          <p className="text-white/40 mb-4">Select an exercise to view progress</p>
          <button
            onClick={() => navigate('progress')}
            className="card-press bg-black/40 backdrop-blur-sm border border-white/8 text-white/90 px-6 py-3 rounded-xl font-semibold"
          >
            Choose Exercise →
          </button>
        </div>
      );
    }

    if (tab === 'freq') {
      const { total, avg, weeks } = data.freq;
      const thisWeek = data.week?.total || 0;
      return (
        <div className="space-y-4">
          <div className={CARD.className} style={CARD.style}>
            <div className="text-center">
              <div className="text-5xl font-bebas text-white leading-none">{total}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-semibold mt-1">Workouts</div>
              {thisWeek > 0 && (
                <div className="text-white/40 text-xs mt-2">+{thisWeek} this week</div>
              )}
            </div>
          </div>
          <div className={CARD.className} style={CARD.style}>
            <div className="text-center">
              <div className="text-5xl font-bebas text-white leading-none">{avg}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-semibold mt-1">Avg / Week</div>
            </div>
          </div>
        </div>
      );
    }

    const d = tab === 'week' ? data.week : data.month;
    const { total, by_type } = d;
    const a = by_type?.DAY_A || 0;
    const b = by_type?.DAY_B || 0;
    const c = by_type?.DAY_C || 0;
    const cardio = by_type?.CARDIO || 0;
    const maxV = Math.max(a, b, c, cardio, 1);
    const thisWeek = data.week?.total || 0;

    return (
      <div className="space-y-4">
        <div className={CARD.className} style={CARD.style}>
          <div className="text-center">
            <div className="text-5xl font-bebas text-white leading-none">{total}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-semibold mt-1">Workouts</div>
            {tab === 'month' && thisWeek > 0 && (
              <div className="text-white/40 text-xs mt-2">+{thisWeek} this week</div>
            )}
          </div>
        </div>

        <div className={CARD.className} style={CARD.style}>
          <div className="text-[10px] text-white/35 uppercase tracking-widest font-semibold mb-3">By type</div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-white/70">Day A</span>
              </div>
              <Bar value={a} max={maxV} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-white/70">Day B</span>
              </div>
              <Bar value={b} max={maxV} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-white/70">Day C</span>
              </div>
              <Bar value={c} max={maxV} />
            </div>
            {cardio > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white/70">Cardio</span>
                </div>
                <Bar value={cardio} max={maxV} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundImage: 'url(/stats-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center top' }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/62" />
      {/* Top gradient — deepens header zone */}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/60 to-transparent" />
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-5">
        <h1 className="text-xl font-bebas tracking-wider pt-2 mb-5 text-white/85">Statistics</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-black/30 backdrop-blur-sm p-1 rounded-2xl overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'text-white/92'
                  : 'text-white/40 active:text-white/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
