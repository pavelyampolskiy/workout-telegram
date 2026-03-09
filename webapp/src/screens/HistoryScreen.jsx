import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { MONTHS_ABBR, formatDate, CARD_BTN_STYLE } from '../shared';
import { HistorySkeleton } from '../components/Skeleton';

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthKey(dateStr) { return dateStr.slice(0, 7); }

function formatMonthLabel(dateStr) {
  const [year, month] = dateStr.split('-');
  return `${MONTHS_LONG[parseInt(month) - 1]} ${year}`;
}

// "14:32" from ISO datetime string (UTC → local)
function formatTime(isoStr) {
  if (!isoStr) return null;
  // Normalize Python isoformat (no timezone) → always treat as UTC
  const normalized = isoStr.replace(' ', 'T').replace(/(\.\d+)?$/, 'Z');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtLabel(type) {
  if (type === 'CARDIO') return 'Cardio';
  return type.replace('DAY_', 'Day ');
}

function fmtVol(v) {
  if (!v) return null;
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F') + ' kg';
}

const FILTERS = [
  { label: 'All', value: null },
  { label: 'Day A', value: 'DAY_A' },
  { label: 'Day B', value: 'DAY_B' },
  { label: 'Day C', value: 'DAY_C' },
  { label: 'Cardio', value: 'CARDIO' },
];

export default function HistoryScreen() {
  const { userId, navigate, showToast } = useApp();
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef(null);

  const PAGE = 10;

  const load = async (off = 0, append = false, type = activeFilter) => {
    try {
      const data = await api.getHistory(off, PAGE, type);
      if (append) {
        setItems(prev => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setHasMore(data.has_more);
      setOffset(off + data.items.length);
    } catch (e) {
      setError(e.message);
      showToast(e.message);
    }
  };

  useEffect(() => {
    load(0).finally(() => setLoading(false));
  }, []);

  // Update indicator position when filter changes
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeIndex = FILTERS.findIndex(f => f.value === activeFilter);
    const tabs = tabsRef.current.querySelectorAll('button');
    if (tabs[activeIndex]) {
      const tab = tabs[activeIndex];
      setIndicatorStyle({
        left: tab.offsetLeft,
        width: tab.offsetWidth,
      });
    }
  }, [activeFilter, loading]);

  const handleFilter = (value) => {
    setActiveFilter(value);
    setFilterLoading(true);
    load(0, false, value).finally(() => setFilterLoading(false));
  };

  const handleMore = async () => {
    setLoadingMore(true);
    await load(offset, true, activeFilter);
    setLoadingMore(false);
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await api.deleteAllHistory();
      setItems([]);
      setHasMore(false);
      setOffset(0);
    } catch (e) {
      setError(e.message);
      showToast(e.message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <ScreenBg />
        <div className="relative z-10 p-5">
          <h1 className="font-bebas text-white/85 pt-2 mb-4" style={{ fontSize: '6vw', letterSpacing: '0.1em' }}>
            History
          </h1>
          <HistorySkeleton />
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
          <div className="flex gap-3">
            <button onClick={() => { setError(null); setLoading(true); load(0).finally(() => setLoading(false)); }} className="card-press rounded-2xl px-6 py-3 font-bebas tracking-wider" style={CARD_BTN_STYLE}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg />
      <div className="relative z-10 p-5">
        <h1 className="font-bebas text-white/85 pt-2 mb-4" style={{ fontSize: '6vw', letterSpacing: '0.1em' }}>
          History
        </h1>

        {/* Filter tabs */}
        <div 
          ref={tabsRef}
          className="relative flex gap-1 mb-5 bg-white/5 p-1 rounded-2xl overflow-x-auto"
        >
          {/* Sliding indicator */}
          <div
            className="absolute top-1 bottom-1 rounded-xl bg-white/12 transition-all duration-300 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          />
          {FILTERS.map(f => (
            <button
              key={f.label}
              onClick={() => handleFilter(f.value)}
              className={`relative z-10 flex-1 py-2 px-2 rounded-xl text-xs font-bebas tracking-wider whitespace-nowrap transition-colors duration-200 ${
                activeFilter === f.value
                  ? 'text-white/92'
                  : 'text-white/35 active:text-white/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filterLoading ? (
          <div className="text-center text-white/30 py-10 text-sm font-bebas tracking-wider">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center text-white/30 py-16">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mx-auto mb-3 opacity-30">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12h6M9 16h4"/>
            </svg>
            <p className="text-sm font-bebas tracking-wider">No workouts yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((w, idx) => {
              const isNewMonth = idx === 0 || getMonthKey(w.date) !== getMonthKey(items[idx - 1].date);

              return (
                <div key={w.id}>
                  {/* Month separator */}
                  {isNewMonth && (
                    <div className={`font-sans text-white/25 text-xs ${idx === 0 ? 'mb-2' : 'mt-5 mb-2'}`}>
                      {formatMonthLabel(w.date)}
                    </div>
                  )}

                  <button
                    onClick={() => navigate('history-detail', { workoutId: w.id })}
                    className="card-press w-full rounded-2xl p-4 text-left"
                    style={CARD_BTN_STYLE}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bebas text-white/92 leading-none text-base tracking-wider">
                          {fmtLabel(w.type)}
                        </div>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                          <span className="font-sans text-white/35 text-xs">{formatDate(w.date)}</span>
                          {w.duration_min > 0 && (
                            <>
                              <span className="font-sans text-white/20 text-xs">•</span>
                              <span className="font-sans text-white/35 text-xs">{w.duration_min} min</span>
                            </>
                          )}
                          {w.total_sets > 0 && (
                            <>
                              <span className="font-sans text-white/20 text-xs">•</span>
                              <span className="font-sans text-white/35 text-xs">{w.total_sets} set{w.total_sets !== 1 ? 's' : ''}</span>
                            </>
                          )}
                          {w.total_volume > 0 && (
                            <>
                              <span className="font-sans text-white/20 text-xs">•</span>
                              <span className="font-sans text-white/35 text-xs">{fmtVol(w.total_volume)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-white/35 text-base shrink-0 mt-0.5">›</span>
                    </div>
                  </button>
                </div>
              );
            })}

            {hasMore && (
              <div className="mt-1">
                <button
                  onClick={handleMore}
                  disabled={loadingMore}
                  className="text-white/35 font-sans text-sm py-2"
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
              className="font-sans text-white/25 text-xs active:text-white/50 transition-colors"
            >
              Delete all history
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="modal-content mx-6 w-full max-w-sm bg-black/90 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-1">Delete all history?</h3>
            <p className="text-sm text-white/40 mb-6 font-sans">All workouts will be permanently removed.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="card-press w-full text-white/90 font-bebas tracking-wider text-base py-3 rounded-xl"
                style={CARD_BTN_STYLE}
              >
                Keep history
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="w-full text-white/45 active:text-white/70 disabled:opacity-40 py-3 font-bebas tracking-wider text-sm transition-colors"
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
