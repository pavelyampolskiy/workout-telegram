import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { StatsSkeleton } from '../components/Skeleton';
import { CARD_BTN_STYLE } from '../shared';

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

const BAR_GRADIENT = 'linear-gradient(90deg, rgba(234,234,234,0.92) 0%, rgba(197,160,89,0.70) 100%)';

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

function PeriodBlock({ label, d, mounted }) {
  const { total, by_type } = d;
  const a = by_type?.DAY_A || 0;
  const b = by_type?.DAY_B || 0;
  const c = by_type?.DAY_C || 0;
  const cardio = by_type?.CARDIO || 0;
  const maxV = Math.max(a, b, c, cardio, 1);

  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-widest font-bebas text-white/40">{label}</div>
      <div className={CARD.className} style={CARD.style}>
        <div className="flex items-baseline gap-2 mb-4">
          <div className="text-5xl font-bebas leading-none" style={GRADIENT_TEXT}>{total}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/50 font-bebas">Workout{total !== 1 ? 's' : ''}</div>
        </div>
        <div className="space-y-4">
          <Bar label="Day A" value={a} max={maxV} mounted={mounted} />
          <Bar label="Day B" value={b} max={maxV} mounted={mounted} />
          <Bar label="Day C" value={c} max={maxV} mounted={mounted} />
          {cardio > 0 && <Bar label="Cardio" value={cardio} max={maxV} mounted={mounted} />}
        </div>
      </div>
    </div>
  );
}

export default function StatsScreen() {
  const { userId, navigate, goBack, showToast } = useApp();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [barMounted, setBarMounted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [week, month, freq] = await Promise.all([
          api.getStats((new Date().getDay() + 6) % 7),
          api.getStats(30),
          api.getFrequency(),
        ]);
        setData({ week, month, freq });
      } catch (e) {
        setError(e.message);
        showToast(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setBarMounted(true), 60);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <ScreenBg />
        <div className="relative z-10 p-5">
          <h1 className="text-xl font-bebas tracking-wider pt-2 mb-5 text-white/85">Statistics</h1>
          <StatsSkeleton />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <ScreenBg />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-5 gap-4">
          <p className="text-white/50 font-bebas tracking-wider text-center">Something went wrong</p>
          <button onClick={() => { setError(null); setLoading(true); }} className="card-press rounded-2xl px-6 py-3 font-bebas tracking-wider" style={CARD_BTN_STYLE}>Retry</button>
        </div>
      </div>
    );
  }

  const { total: freqTotal, avg } = data.freq;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg />
      <div className="relative z-10 p-5 pb-10">
        <button onClick={goBack} className="flex items-center gap-1 mb-3 -ml-0.5">
          <span className="text-white/35 text-base leading-none">‹</span>
          <span className="font-bebas tracking-wider text-white/35 text-sm">Back</span>
        </button>
        <h1 className="text-xl font-bebas tracking-wider mb-5 text-white/85">Statistics</h1>

        <div className="space-y-6">
          {/* Month */}
          <PeriodBlock label="This month" d={data.month} mounted={barMounted} />

          {/* Week */}
          <PeriodBlock label="This week" d={data.week} mounted={barMounted} />

          {/* Frequency */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-bebas text-white/40">All time</div>
            <div className={CARD.className} style={CARD.style}>
              <div className="flex">
                <div className="flex-1 text-center border-r border-white/[0.06] pr-4">
                  <div className="text-5xl font-bebas leading-none" style={GRADIENT_TEXT}>{freqTotal}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50 font-bebas mt-1">Workout{freqTotal !== 1 ? 's' : ''}</div>
                </div>
                <div className="flex-1 text-center pl-4">
                  <div className="text-5xl font-bebas leading-none" style={GRADIENT_TEXT}>{avg}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50 font-bebas mt-1">Avg / Week</div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress link */}
          <button
            onClick={() => navigate('progress')}
            className="card-press w-full rounded-xl p-4 text-left flex items-center justify-between"
            style={CARD_BTN_STYLE}
          >
            <span className="font-bebas tracking-wider text-white/80">Exercise Progress</span>
            <span className="text-white/30 text-xl">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
