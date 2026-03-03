import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

function Bar({ value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full bg-white/60 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-mono text-white/50 w-4 text-right">{value}</span>
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
    return <div className="p-5 text-center text-red-400 pt-20">{error}</div>;
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
            className="bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Choose Exercise →
          </button>
        </div>
      );
    }

    if (tab === 'freq') {
      const { total, avg, weeks } = data.freq;
      return (
        <div className="space-y-4">
          <div className="bg-white/8 border border-white/8 rounded-2xl p-5 text-center">
            <div className="text-5xl font-bebas text-white mb-1">{total}</div>
            <div className="text-white/40 text-sm">workouts in {weeks} weeks</div>
          </div>
          <div className="bg-white/8 border border-white/8 rounded-2xl p-5 text-center">
            <div className="text-5xl font-bebas text-white mb-1">{avg}</div>
            <div className="text-white/40 text-sm">avg per week</div>
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

    return (
      <div className="space-y-4">
        <div className="bg-white/8 border border-white/8 rounded-2xl p-5 text-center">
          <div className="text-5xl font-bebas text-white mb-1">{total}</div>
          <div className="text-white/40 text-sm">total workouts</div>
        </div>

        <div className="bg-white/8 border border-white/8 rounded-2xl p-5 space-y-3">
          <div className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3">By type</div>
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
    );
  };

  return (
    <div className="p-5">
      <h1 className="text-xl font-bebas tracking-wider pt-2 mb-5">Statistics</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white/8 p-1 rounded-2xl overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-white/20 text-white'
                : 'text-white/40 active:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
}
