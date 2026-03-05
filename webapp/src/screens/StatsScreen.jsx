import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';

const CARD = {
  className: 'bg-white/5 rounded-2xl p-5',
  style: { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' },
};

function Bar({ label, value, max, mounted }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-bebas tracking-wider" style={{ color: 'rgba(255,255,255,0.87)' }}>{label}</span>
        <span className="text-sm font-bebas tracking-wider" style={{ color: 'rgba(255,255,255,0.77)' }}>{value}</span>
      </div>
      <div className="h-2.5 rounded-lg" style={{ background: '#1F1F1F' }}>
        <div
          className="h-full rounded-lg"
          style={{
            width: mounted ? `${pct}%` : '0%',
            background: '#DCDCDC',
            transition: 'width 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        />
      </div>
    </div>
  );
}

export default function StatsScreen() {
  const { userId, navigate } = useApp();
  const [tab, setTab] = useState('week');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [barMounted, setBarMounted] = useState(false);

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

  // Reset bar animation when tab changes
  useEffect(() => {
    setBarMounted(false);
    const t = setTimeout(() => setBarMounted(true), 60);
    return () => clearTimeout(t);
  }, [tab, loading]);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <ScreenBg />
        <div className="relative z-10 flex items-center justify-center h-screen text-white/40 font-bebas tracking-wider">Loading…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <ScreenBg />
        <div className="relative z-10 flex items-center justify-center h-screen text-red-400/80 font-bebas tracking-wider p-5 text-center">{error}</div>
      </div>
    );
  }

  const TABS = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'freq', label: 'Frequency' },
    { key: 'progress', label: 'Progress' },
  ];

  const renderContent = () => {
    if (tab === 'freq') {
      const { total, avg } = data.freq;
      return (
        <div className={CARD.className} style={CARD.style}>
          <div className="flex">
            <div className="flex-1 text-center border-r border-white/[0.06] pr-4">
              <div className="text-5xl font-bebas text-white leading-none">{total}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-sans mt-1">Workout{total !== 1 ? 's' : ''}</div>
            </div>
            <div className="flex-1 text-center pl-4">
              <div className="text-5xl font-bebas text-white leading-none">{avg}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-sans mt-1">Avg / Week</div>
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

    return (
      <div className="space-y-4">
        <div className={CARD.className} style={CARD.style}>
          <div className="text-center">
            <div className="text-5xl font-bebas text-white leading-none">{total}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-sans mt-1">Workout{total !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className={CARD.className} style={CARD.style}>
          <div className="text-[10px] uppercase tracking-widest font-sans mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>By type</div>
          <div className="space-y-4">
            <Bar label="Day A" value={a} max={maxV} mounted={barMounted} />
            <Bar label="Day B" value={b} max={maxV} mounted={barMounted} />
            <Bar label="Day C" value={c} max={maxV} mounted={barMounted} />
            {cardio > 0 && (
              <Bar label="Cardio" value={cardio} max={maxV} mounted={barMounted} />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg />
      <div className="relative z-10 p-5">
        <h1 className="text-xl font-bebas tracking-wider pt-2 mb-5 text-white/85">Statistics</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white/5 p-1 rounded-2xl overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => t.key === 'progress' ? navigate('progress') : setTab(t.key)}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bebas tracking-wider whitespace-nowrap transition-all duration-200 ${
                tab === t.key
                  ? 'bg-white/12 text-white/92'
                  : 'text-white/35 active:text-white/60'
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
