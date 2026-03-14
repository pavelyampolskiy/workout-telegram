import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { formatDate as fmtDate, fmtW, CARD_BTN_STYLE } from '../shared';

function LineChart({ data }) {
  if (!data || data.length < 2) return null;

  const W = 300, H = 130;
  const LPAD = 32, RPAD = 8, TPAD = 14, BPAD = 28;

  const weights = data.map(d => d.max_weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const xs = data.map((_, i) => LPAD + (i / (data.length - 1)) * (W - LPAD - RPAD));
  const ys = weights.map(w => TPAD + ((maxW - w) / range) * (H - TPAD - BPAD));

  // Smooth bezier: control points at midpoints keep y of nearest endpoint
  const pathD = xs.reduce((acc, x, i) => {
    if (i === 0) return `M${x.toFixed(1)},${ys[i].toFixed(1)}`;
    const cpx = ((xs[i - 1] + x) / 2).toFixed(1);
    return acc + ` C${cpx},${ys[i-1].toFixed(1)} ${cpx},${ys[i].toFixed(1)} ${x.toFixed(1)},${ys[i].toFixed(1)}`;
  }, '');

  const areaD = `${pathD} L${xs[xs.length-1].toFixed(1)},${H - BPAD} L${xs[0].toFixed(1)},${H - BPAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Y-axis labels */}
      <text x={LPAD - 4} y={TPAD + 4} fill="rgba(255,255,255,0.35)" fontSize="9" textAnchor="end" fontFamily="'Bebas Neue', sans-serif">{fmtW(maxW)}</text>
      <text x={LPAD - 4} y={H - BPAD} fill="rgba(255,255,255,0.35)" fontSize="9" textAnchor="end" fontFamily="'Bebas Neue', sans-serif">{fmtW(minW)}</text>

      {/* X-axis date labels */}
      <text x={xs[0]} y={H - 4} fill="rgba(255,255,255,0.30)" fontSize="8" textAnchor="start" fontFamily="'Bebas Neue', sans-serif">{fmtDate(data[0].date)}</text>
      <text x={xs[xs.length-1]} y={H - 4} fill="rgba(255,255,255,0.30)" fontSize="8" textAnchor="end" fontFamily="'Bebas Neue', sans-serif">{fmtDate(data[data.length-1].date)}</text>

      {/* Baseline */}
      <line x1={LPAD} y1={H - BPAD} x2={W - RPAD} y2={H - BPAD} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* Area fill */}
      <path d={areaD} fill="url(#grad)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={3} fill="rgba(255,255,255,0.9)" />
      ))}
    </svg>
  );
}

export default function ProgressScreen() {
  const { userId, goBack, showToast } = useApp();
  const [program, setProgram] = useState(null);
  const [selected, setSelected] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProg, setLoadingProg] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [previousName, setPreviousName] = useState('');
  const [linking, setLinking] = useState(false);

  const loadProgram = () => {
    api.getProgram(userId)
      .then(p => {
        const seen = new Set();
        const list = [];
        for (const day of ['DAY_A', 'DAY_B', 'DAY_C']) {
          for (const ex of (p[day] || [])) {
            if (!seen.has(ex.name)) { seen.add(ex.name); list.push(ex); }
          }
        }
        setProgram(list);
      })
      .catch(e => { setError(e.message); showToast(e.message); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProgram(); }, []);

  const handleSelect = async (ex) => {
    setSelected(ex);
    setOpen(false);
    setLoadingProg(true);
    try {
      const data = await api.getProgress(userId, ex.name);
      setProgress(data);
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoadingProg(false);
    }
  };

  if (loading) {
    return <LoadingScreen image="/workout-bg.jpg" />;
  }
  if (error) {
    return (
      <ErrorScreen
        image="/workout-bg.jpg"
        onBack={goBack}
        onRetry={() => { setError(null); setLoading(true); loadProgram(); }}
      />
    );
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
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/workout-bg.jpg" />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top overflow-y-auto">
        <h1 className="text-xl font-bebas tracking-wider pt-6 mb-5">Progress</h1>

        {/* Exercise selector */}
        <div className="relative mb-5">
          <button
            onClick={() => setOpen(!open)}
            className="card-press w-full rounded-2xl p-4 text-left flex items-center justify-between"
            style={CARD_BTN_STYLE}
          >
            <span className={selected ? 'text-white font-bebas tracking-wider' : 'text-white/40 font-bebas tracking-wider'}>
              {selected ? selected.name : 'Select exercise…'}
            </span>
            <span className="text-white/35 text-lg">{open ? '▲' : '▼'}</span>
          </button>

          {open && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl max-h-60 overflow-y-auto backdrop-blur-xl" style={{ background: 'rgba(18,18,18,0.28)' }}>
              {program.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(ex)}
                  className="w-full text-left px-4 py-3 active:bg-white/8 border-b border-white/[0.05] last:border-0 transition-colors"
                >
                  <div className="text-sm font-bebas tracking-wider text-white/80">{ex.name}</div>
                  <div className="text-xs text-white/30 font-bebas">{ex.group}</div>
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
            <div className="text-center text-white/30 py-8">
              <div className="flex justify-center mb-3 text-white/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <p className="font-bebas text-sm mb-5">No data yet for {selected.name}</p>
              <p className="font-sans text-xs text-white/40 mb-2">Was it renamed? Enter the previous name to link history:</p>
              <div className="flex gap-2 max-w-xs mx-auto">
                <input
                  type="text"
                  value={previousName}
                  onChange={(e) => setPreviousName(e.target.value)}
                  placeholder="e.g. French press"
                  className="flex-1 rounded-xl px-3 py-2 text-sm font-sans bg-white/10 border border-white/15 text-white placeholder-white/30"
                />
                <button
                  type="button"
                  disabled={linking || !previousName.trim()}
                  onClick={async () => {
                    const from = previousName.trim();
                    if (!from) return;
                    setLinking(true);
                    try {
                      await api.linkProgressAlias(userId, from, selected.name);
                      const data = await api.getProgress(userId, selected.name);
                      setProgress(data);
                      setPreviousName('');
                      showToast(data.length > 0 ? 'History linked' : 'No data under that name');
                    } catch (e) {
                      showToast(e.message);
                    } finally {
                      setLinking(false);
                    }
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-bebas tracking-wider bg-white/15 text-white/90 disabled:opacity-50"
                >
                  {linking ? '…' : 'Link'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {t && (
                <div className="bg-white/[0.04] border border-white/[0.04] rounded-2xl p-4 flex items-center gap-3">
                  <span className={`text-2xl font-bebas tracking-wider ${t.color}`}>{t.text}</span>
                  <span className="text-white/40 text-sm font-bebas">over {progress.length} sessions</span>
                </div>
              )}

              <div className="bg-white/[0.04] border border-white/[0.04] rounded-2xl p-4">
                <div className="text-xs text-white/40 mb-3 uppercase tracking-widest font-bebas">
                  Max weight per session (kg)
                </div>
                <LineChart data={progress} />
              </div>

              <div className="bg-white/[0.04] border border-white/[0.04] rounded-2xl p-4">
                <div className="text-xs text-white/40 mb-3 uppercase tracking-widest font-bebas">
                  Sessions
                </div>
                <div className="space-y-2">
                  {[...progress].reverse().map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-white/40 text-sm font-bebas">{fmtDate(r.date)}</span>
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
            <p className="font-bebas text-sm">Select an exercise above</p>
          </div>
        )}
      </div>
    </div>
  );
}
