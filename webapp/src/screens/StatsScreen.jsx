import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Tabs } from '../components/Tabs';
import { StatsSkeleton } from '../components/Skeleton';
import { ErrorScreen } from '../components/ErrorScreen';

const CARD = {
  className: 'bg-white/5 rounded-2xl p-5',
  style: { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' },
};

const GRADIENT_TEXT = {
  background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.5) 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const BAR_GRADIENT = 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 100%)';

function Bar({ label, value, max, mounted }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-bebas tracking-wider" style={{ color: 'rgba(255,255,255,0.87)' }}>{label}</span>
        <span className="text-sm font-bebas tracking-wider" style={GRADIENT_TEXT}>{value}</span>
      </div>
      <div className="h-2.5 rounded-lg" style={{ background: '#1F1F1F' }}>
        <div
          className="h-full rounded-lg"
          style={{
            width: mounted ? `${pct}%` : '0%',
            background: BAR_GRADIENT,
            transition: 'width 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        />
      </div>
    </div>
  );
}

const PERIOD_OPTIONS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export default function StatsScreen() {
  const { userId, navigate, showToast } = useApp();
  const [tab, setTab] = useState('amount');
  const [amountPeriod, setAmountPeriod] = useState('week'); // week | month | year
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [barMounted, setBarMounted] = useState(false);

  const STATS_TABS = [
    { key: 'amount', label: 'Amount' },
    { key: 'freq', label: 'Frequency' },
    { key: 'progress', label: 'Progress' },
  ];

  useEffect(() => {
    async function load() {
      try {
        const [week, month, year, freq] = await Promise.all([
          api.getStats(userId, 7),
          api.getStats(userId, 30),
          api.getStats(userId, 365),
          api.getFrequency(userId),
        ]);
        setData({ week, month, year, freq });
      } catch (e) {
        setError(e.message);
        showToast(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, showToast]);

  // Reset bar animation when tab or period changes
  useEffect(() => {
    setBarMounted(false);
    const t = setTimeout(() => setBarMounted(true), 60);
    return () => clearTimeout(t);
  }, [tab, amountPeriod, loading]);

  const handleTabSelect = (key) => {
    if (key === 'progress') navigate('progress');
    else setTab(key);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/workout-bg.jpg" />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top overflow-y-auto">
          <h1 className="text-xl font-bebas tracking-wider pt-6 mb-5 text-white/85">Statistics</h1>
          <StatsSkeleton />
        </div>
      </div>
    );
  }
  const retryStats = () => {
    setError(null);
    setLoading(true);
    Promise.all([
      api.getStats(userId, 7),
      api.getStats(userId, 30),
      api.getStats(userId, 365),
      api.getFrequency(userId),
    ])
      .then(([week, month, year, freq]) => setData({ week, month, year, freq }))
      .catch(e => { setError(e.message); showToast(e.message); })
      .finally(() => setLoading(false));
  };

  if (error) {
    return <ErrorScreen image="/workout-bg.jpg" onRetry={retryStats} />;
  }

  const renderContent = () => {
    if (tab === 'freq') {
      const { total, avg } = data.freq;
      return (
        <div className={CARD.className} style={CARD.style}>
          <div className="flex">
            <div className="flex-1 text-center border-r border-white/[0.06] pr-4">
              <div className="text-5xl font-bebas leading-none" style={GRADIENT_TEXT}>{total}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-bebas mt-1">Workout{total !== 1 ? 's' : ''}</div>
            </div>
            <div className="flex-1 text-center pl-4">
              <div className="text-5xl font-bebas leading-none" style={GRADIENT_TEXT}>{avg}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-bebas mt-1">Avg / Week</div>
            </div>
          </div>
        </div>
      );
    }

    if (tab === 'amount') {
      const d = data[amountPeriod];
      if (!d) return null;
      return (
        <>
          <div className={`mb-4 rounded-2xl overflow-hidden ${CARD.className}`} style={CARD.style}>
            <div className="divide-y divide-white/[0.06]">
              {PERIOD_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAmountPeriod(key)}
                  className={`w-full py-3.5 px-4 text-left font-bebas tracking-wider text-base transition-colors ${
                    amountPeriod === key
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 active:bg-white/10 active:text-white/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {renderAmountContent(d)}
        </>
      );
    }

    return null;
  };

  const renderAmountContent = (d) => {
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
            <div className="text-5xl font-bebas leading-none" style={GRADIENT_TEXT}>{total}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-bebas mt-1">Workout{total !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className={CARD.className} style={CARD.style}>
          <div className="text-[10px] uppercase tracking-widest font-bebas mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>By type</div>
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
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/workout-bg.jpg" />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top overflow-y-auto">
        <h1 className="text-xl font-bebas tracking-wider pt-6 mb-5 text-white/85">Statistics</h1>

        {/* Tabs */}
        <div className="mb-5">
          <Tabs tabs={STATS_TABS} activeKey={tab} onSelect={handleTabSelect} />
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
