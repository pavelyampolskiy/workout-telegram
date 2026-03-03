import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

const MONTHS_LONG = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
const MONTHS_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN',
  'JUL','AUG','SEP','OCT','NOV','DEC'];

function getMonthKey(dateStr) { return dateStr.slice(0, 7); }

function formatMonthLabel(dateStr) {
  const [year, month] = dateStr.split('-');
  return `${MONTHS_LONG[parseInt(month) - 1]} ${year}`;
}

// "03 MAR 2026"
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day} ${MONTHS_ABBR[parseInt(month) - 1]} ${year}`;
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await api.deleteAllHistory(userId);
      setItems([]);
      setHasMore(false);
      setOffset(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-white/40">Loading…</div>;
  }

  if (error) {
    return <div className="p-5 text-center text-white/40 pt-20">{error}</div>;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 scale-110" style={{ backgroundImage: 'url(/history-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }} />
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
                      <div className="w-[6px] h-[6px] rounded-full bg-white/20" />
                    </div>

                    {/* Card */}
                    <button
                      onClick={() => navigate('history-detail', { workoutId: w.id })}
                      className="card-press flex-1 ml-2 backdrop-blur-sm rounded-2xl p-4 text-left"
                      style={{ background: 'rgba(0,0,0,0.65)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bebas text-white/92 leading-none" style={{ fontSize: '17px', letterSpacing: '0.02em' }}>
                            {fmtLabel(w.type)}
                          </div>
                          <div className="text-white/60 mt-1.5" style={{ fontSize: '13px', letterSpacing: '0.04em' }}>
                            {formatDate(w.date)}
                          </div>
                          {summary ? (
                            <div className="text-white/40 mt-2 leading-snug" style={{ fontSize: '12px' }}>
                              {summary}
                            </div>
                          ) : null}
                        </div>
                        <span className="text-white/20 text-base shrink-0 mt-0.5">›</span>
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

        {/* Delete all — only when there's something to delete */}
        {items.length > 0 && (
          <div className="mt-10 mb-6 flex justify-center">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-white/25 active:text-white/50 text-xs transition-colors"
            >
              Delete all history
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="mx-6 w-full max-w-sm bg-black/90 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-1">Delete all history?</h3>
            <p className="text-sm text-white/40 mb-6">All workouts will be permanently removed.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="card-press w-full bg-white/10 border border-white/15 text-white/90 font-semibold py-3 rounded-xl transition-colors"
              >
                Keep history
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="w-full text-white/45 active:text-white/70 disabled:opacity-40 py-3 text-sm font-medium transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
