import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

function fmtW(w) {
  return w === Math.floor(w) ? String(Math.floor(w)) : String(w);
}

function LineChart({ data }) {
  if (!data || data.length < 2) return null;
  const W = 300, H = 100, PAD = 16;
  const weights = data.map(d => d.max_weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2));
  const ys = weights.map(w => H - PAD - ((w - minW) / range) * (H - PAD * 2));
  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const areaD = `${pathD} L${xs[xs.length - 1]},${H} L${xs[0]},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.3)" stopOpacity="1" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#grad)" />
      <path d={pathD} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={4} fill="rgba(255,255,255,0.8)" />
      ))}
    </svg>
  );
}

export default function ProgressScreen() {
  const { userId } = useApp();
  const [program, setProgram] = useState(null);
  const [selected, setSelected] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProg, setLoadingProg] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.getProgram()
      .then(p => {
        // Deduplicate exercises across days
        const seen = new Set();
        const list = [];
        for (const day of ['DAY_A', 'DAY_B', 'DAY_C']) {
          for (const ex of p[day]) {
            if (!seen.has(ex.name)) {
              seen.add(ex.name);
              list.push(ex);
            }
          }
        }
        setProgram(list);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (ex) => {
    setSelected(ex);
    setOpen(false);
    setLoadingProg(true);
    try {
      const data = await api.getProgress(userId, ex.name);
      setProgress(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingProg(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-white/40">Loading…</div>;
  }
  if (error) {
    return <div className="p-5 text-center text-red-400 pt-20">{error}</div>;
  }

  const trend = () => {
    if (!progress || progress.length < 2) return null;
    const delta = progress[progress.length - 1].max_weight - progress[0].max_weight;
    if (delta > 0) return { text: `↑ +${fmtW(delta)} kg`, color: 'text-green-400' };
    if (delta < 0) return { text: `↓ ${fmtW(delta)} kg`, color: 'text-red-400' };
    return { text: '→ No change', color: 'text-white/40' };
  };

  const t = trend();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 scale-110" style={{ backgroundImage: 'url(/gym-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }} />
      <div className="absolute inset-0 bg-black/65" />
      <div className="relative z-10 p-5">
      <h1 className="text-xl font-bebas tracking-wider pt-2 mb-5">Progress</h1>

      {/* Exercise selector */}
      <div className="relative mb-5">
        <button
          onClick={() => setOpen(!open)}
          className="card-press w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-left flex items-center justify-between"
        >
          <span className={selected ? 'text-white font-bebas tracking-wider' : 'text-white/40 font-bebas tracking-wider'}>
            {selected ? selected.name : 'Select exercise…'}
          </span>
          <span className="text-white/30 text-lg">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-black/90 border border-white/10 rounded-2xl overflow-hidden shadow-xl max-h-60 overflow-y-auto">
            {program.map((ex, i) => (
              <button
                key={i}
                onClick={() => handleSelect(ex)}
                className="w-full text-left px-4 py-3 active:bg-white/10 border-b border-white/10 last:border-0 transition-colors"
              >
                <div className="text-sm font-bebas tracking-wider text-white/80">{ex.name}</div>
                <div className="text-xs text-white/30 font-bebas tracking-wider">{ex.group}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progress data */}
      {loadingProg && (
        <div className="text-center text-white/40 py-12 font-bebas tracking-wider">Loading data…</div>
      )}

      {!loadingProg && selected && progress && (
        progress.length === 0 ? (
          <div className="text-center text-white/30 py-12">
            <div className="flex justify-center mb-3 text-white/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
            <p className="font-bebas tracking-wider">No data yet for {selected.name}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Trend */}
            {t && (
              <div className="bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <span className={`text-2xl font-bebas tracking-wider ${t.color}`}>{t.text}</span>
                <span className="text-white/40 text-sm font-bebas tracking-wider">over {progress.length} sessions</span>
              </div>
            )}

            {/* Chart */}
            <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
              <div className="text-xs text-white/40 mb-3 uppercase tracking-wider font-bebas">
                Max weight per session (kg)
              </div>
              <LineChart data={progress} />
            </div>

            {/* Session list */}
            <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
              <div className="text-xs text-white/40 mb-3 uppercase tracking-wider font-bebas">
                Sessions
              </div>
              <div className="space-y-2">
                {[...progress].reverse().map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-white/40 text-sm font-bebas tracking-wider">{r.date}</span>
                    <span className="text-white/80 font-bebas tracking-wider">{fmtW(r.max_weight)} kg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}

      {!selected && !loadingProg && (
        <div className="text-center text-white/30 py-16">
          <div className="flex justify-center mb-3 text-white/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
            <path d="M4 20V12M8 20V16M12 20V8M16 20V14M20 20V4"/>
          </svg>
        </div>
          <p className="font-bebas tracking-wider">Select an exercise above</p>
        </div>
      )}
      </div>
    </div>
  );
}
