import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

const MONTHS_LONG = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'];

function getMonthKey(dateStr) { return dateStr.slice(0, 7); }

function formatMonthLabel(dateStr) {
  const [year, month] = dateStr.split('-');
  return `${MONTHS_LONG[parseInt(month) - 1]} ${year}`;
}

function formatDate(dateStr) {
  const [, month, day] = dateStr.split('-');
  return `${MONTHS_SHORT[parseInt(month) - 1]} ${parseInt(day)}`;
}

function fmtLabel(type) {
  if (type === 'CARDIO') return 'Cardio';
  return type.replace('DAY_', 'Day ');
}

function fmtVol(v) {
  if (!v) return null;
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F') + ' kg';
}

export default function HistoryScreen() {
  const { userId, navigate } = useApp();
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const PAGE = 10;

  const load = async (off = 0, append = false) => {
    try {
      const data = await api.getHistory(userId, off, PAGE);
      if (append) {
        setItems(prev => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setHasMore(data.has_more);
      setOffset(off + data.items.length);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load(0).finally(() => setLoading(false));
  }, []);

  const handleMore = async () => {
    setLoadingMore(true);
    await load(offset, true);
    setLoadingMore(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-white/40">Loading…</div>;
  }

  if (error) {
    return <div className="p-5 text-center text-white/40 pt-20">{error}</div>;
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundImage: 'url(/history-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/65" />
      <div className="relative z-10 p-5">
        <h1 className="font-bebas text-white/85 pt-2 mb-6" style={{ fontSize: '6vw', letterSpacing: '0.1em' }}>
          History
        </h1>

        {items.length === 0 ? (
          <div className="text-center text-white/30 py-16">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mx-auto mb-3 opacity-30">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12h6M9 16h4"/>
            </svg>
            <p className="text-sm">No workouts yet</p>
          </div>
        ) : (
          <div className="relative ml-2">
            {/* Timeline */}
            <div className="absolute left-[5px] top-3 bottom-3 w-px bg-white/6 pointer-events-none" />

            {items.map((w, idx) => {
              const isNewMonth = idx === 0 || getMonthKey(w.date) !== getMonthKey(items[idx - 1].date);
              const summary = [
                w.total_sets > 0 && `${w.total_sets} sets`,
                w.total_volume > 0 && fmtVol(w.total_volume),
              ].filter(Boolean).join(' • ');

              return (
                <div key={w.id}>
                  {/* Month separator */}
                  {isNewMonth && (
                    <div className={`pl-7 text-[10px] uppercase tracking-widest text-white/35 font-semibold ${idx === 0 ? 'mb-3' : 'mt-5 mb-3'}`}>
                      {formatMonthLabel(w.date)}
                    </div>
                  )}

                  <div className="flex items-start mb-2">
                    {/* Dot on timeline */}
                    <div className="w-3 shrink-0 flex justify-center pt-[15px] z-10">
                      <div className="w-[5px] h-[5px] rounded-full bg-white/20 ring-2 ring-black/60" />
                    </div>

                    {/* Card */}
                    <button
                      onClick={() => navigate('history-detail', { workoutId: w.id })}
                      className="card-press flex-1 ml-2 bg-white/8 border border-white/8 rounded-xl p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bebas text-white/90 leading-none tracking-wider text-lg">
                            {fmtLabel(w.type)}
                          </div>
                          <div className="text-xs text-white/50 mt-0.5">
                            {formatDate(w.date)}
                          </div>
                          {summary ? (
                            <div className="text-[11px] text-white/35 mt-2">
                              {summary}
                            </div>
                          ) : null}
                        </div>
                        <span className="text-white/20 text-lg shrink-0 mt-0.5">›</span>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="pl-7 mt-1">
                <button
                  onClick={handleMore}
                  disabled={loadingMore}
                  className="text-white/35 text-sm py-2"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
