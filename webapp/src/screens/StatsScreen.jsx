import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Tabs } from '../components/Tabs';
import { StatsSkeleton } from '../components/Skeleton';
import { ErrorScreen } from '../components/ErrorScreen';

const CARD = {
  className: 'bg-white/5 rounded-2xl p-5',
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

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function ActivityHeatmap({ dates = [], displayYear, displayMonth }) {
  const countByDate = {};
  dates.forEach((d) => { countByDate[d] = (countByDate[d] || 0) + 1; });

  const now = new Date();
  const year = displayYear != null ? displayYear : now.getFullYear();
  const month = displayMonth != null ? displayMonth - 1 : now.getMonth();
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstWeekday = first.getDay();
  const mondayCol = firstWeekday === 0 ? 7 : firstWeekday;
  const cells = [];
  for (let day = 1; day <= lastDay; day++) {
    cells.push(toDateStr(new Date(year, month, day)));
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1.5 items-center w-full">
        {DAY_LABELS.map((label) => (
          <div key={label} className="min-w-0 flex items-center justify-center text-[10px] font-sans text-white/40 uppercase tracking-wide">
            {label}
          </div>
        ))}
        {cells.map((dateStr, i) => {
          const count = countByDate[dateStr] || 0;
          const opacity = count === 0 ? 0.08 : Math.min(0.95, 0.35 + count * 0.2);
          return (
            <div
              key={i}
              className="w-full aspect-square max-w-[999px] rounded-[4px] transition-colors flex items-center justify-center"
              style={{
                background: `rgba(255,255,255,${opacity})`,
                gridColumn: i === 0 ? mondayCol : 'auto',
              }}
              title={count > 0 ? `${dateStr}${count > 1 ? ` — ${count} workouts` : ''}` : dateStr}
              aria-hidden
            >
              {count > 1 && (
                <span className="text-[8px] font-bebas text-white/90 leading-none">{count}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getMonthOptions(freqMonths) {
  const now = new Date();
  const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const list = (freqMonths || []).map(({ year, month }) => ({
    year,
    month,
    label: getMonthLabel(`${year}-${String(month).padStart(2, '0')}-01`),
  }));
  const hasCurrent = list.some((o) => o.year === current.year && o.month === current.month);
  if (!hasCurrent) {
    list.unshift({
      ...current,
      label: getMonthLabel(`${current.year}-${String(current.month).padStart(2, '0')}-01`),
    });
  }
  return list.length ? list : [{ ...current, label: getMonthLabel(`${current.year}-${String(current.month).padStart(2, '0')}-01`) }];
}

export default function StatsScreen() {
  const { userId, navigate, showToast } = useApp();
  const [tab, setTab] = useState('amount');
  const [amountPeriod, setAmountPeriod] = useState('week'); // week | month | year
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [barMounted, setBarMounted] = useState(false);
  const [freqMonth, setFreqMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  });
  const [freqMonths, setFreqMonths] = useState([]);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const STATS_TABS = [
    { key: 'amount', label: 'Workouts' },
    { key: 'freq', label: 'Frequency' },
    { key: 'progress', label: 'Progress' },
  ];

  useEffect(() => {
    async function load() {
      try {
        const [week, month, year, freq, months] = await Promise.all([
          api.getStats(userId, 7),
          api.getStats(userId, 30),
          api.getStats(userId, 365),
          api.getFrequency(userId),
          api.getFrequencyMonths(userId),
        ]);
        setData({ week, month, year, freq });
        setFreqMonths(months || []);
      } catch (e) {
        setError(e.message);
        showToast(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, showToast]);

  useEffect(() => {
    if (tab !== 'freq' || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const freq = await api.getFrequency(userId, 'month', freqMonth.year, freqMonth.month);
        if (!cancelled) setData((prev) => ({ ...prev, freq }));
      } catch (e) {
        if (!cancelled) showToast(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, tab, freqMonth, showToast]);

  useEffect(() => {
    if (tab !== 'freq') setMonthPickerOpen(false);
  }, [tab]);

  // Reset bar animation when tab or period changes
  useEffect(() => {
    setBarMounted(false);
    const t = setTimeout(() => setBarMounted(true), 60);
    return () => clearTimeout(t);
  }, [tab, amountPeriod, loading]);

  const handleTabSelect = (key) => {
    if (key === 'progress') navigate('progress');
    else {
      setTab(key);
      if (key === 'freq') {
        const n = new Date();
        setFreqMonth({ year: n.getFullYear(), month: n.getMonth() + 1 });
      }
    }
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
      api.getFrequencyMonths(userId),
    ])
      .then(([week, month, year, freq, months]) => {
        setData({ week, month, year, freq });
        setFreqMonths(months || []);
      })
      .catch(e => { setError(e.message); showToast(e.message); })
      .finally(() => setLoading(false));
  };

  if (error) {
    return <ErrorScreen image="/workout-bg.jpg" onRetry={retryStats} />;
  }

  const renderContent = () => {
    if (tab === 'freq') {
      const { total, avg, dates = [] } = data.freq;
      return (
        <div className="space-y-4">
          <div className={CARD.className}>
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
          <div className={CARD.className}>
            <ActivityHeatmap
              dates={dates}
              displayYear={data.freq.year}
              displayMonth={data.freq.month}
            />
            {data.freq.period === 'month' && (
              <div className="mt-2 relative">
                <button
                  type="button"
                  onClick={() => setMonthPickerOpen((o) => !o)}
                  className="font-sans text-[10px] text-white/50 hover:text-white/70 uppercase tracking-wider flex items-center gap-1"
                >
                  {data.freq.year != null
                    ? getMonthLabel(`${data.freq.year}-${String(data.freq.month).padStart(2, '0')}-01`)
                    : getMonthLabel(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`)}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {monthPickerOpen && (
                  <>
                    <div
                      className="absolute left-0 top-full mt-1 z-20 py-2 rounded-2xl min-w-[140px] max-h-[50vh] overflow-y-auto backdrop-blur-sm bg-white/5"
                    >
                      {getMonthOptions(freqMonths).map((opt) => (
                        <button
                          key={`${opt.year}-${opt.month}`}
                          type="button"
                          onClick={() => {
                            setFreqMonth({ year: opt.year, month: opt.month });
                            setMonthPickerOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-sans text-white/90 active:bg-white/10 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      aria-label="Close"
                      className="fixed inset-0 z-10"
                      onClick={() => setMonthPickerOpen(false)}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (tab === 'amount') {
      const d = data[amountPeriod];
      if (!d) return null;
      return (
        <>
          <div className="mb-2">
            <Tabs tabs={PERIOD_OPTIONS} activeKey={amountPeriod} onSelect={setAmountPeriod} />
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
        <div className={CARD.className}>
          <div className="text-center">
            <div className="text-5xl font-bebas leading-none" style={GRADIENT_TEXT}>{total}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-bebas mt-1">Workout{total !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className={CARD.className}>
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
        <div className="mb-2">
          <Tabs tabs={STATS_TABS} activeKey={tab} onSelect={handleTabSelect} />
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
