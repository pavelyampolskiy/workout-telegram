import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Tabs } from '../components/Tabs';
import { ConfirmModal } from '../components/ConfirmModal';
import { ErrorScreen } from '../components/ErrorScreen';
import { formatDate, formatMonthLabel, fmtWorkoutType, fmtVol, CARD_BTN_STYLE, PAGE_HEADING_STYLE } from '../shared';
import { HistorySkeleton } from '../components/Skeleton';

function getMonthKey(dateStr) { return dateStr.slice(0, 7); }

// "14:32" from ISO datetime string (UTC → local)
function formatTime(isoStr) {
  if (!isoStr) return null;
  // Normalize Python isoformat (no timezone) → always treat as UTC
  const normalized = isoStr.replace(' ', 'T').replace(/(\.\d+)?$/, 'Z');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

const FILTER_TABS = [
  { key: 'all', label: 'All', apiValue: null },
  { key: 'DAY_A', label: 'Day A', apiValue: 'DAY_A' },
  { key: 'DAY_B', label: 'Day B', apiValue: 'DAY_B' },
  { key: 'DAY_C', label: 'Day C', apiValue: 'DAY_C' },
  { key: 'CARDIO', label: 'Cardio', apiValue: 'CARDIO' },
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
  const [activeFilter, setActiveFilter] = useState('all');

  const PAGE = 10;

  const load = async (off = 0, append = false, filterKey = activeFilter) => {
    const type = FILTER_TABS.find(f => f.key === filterKey)?.apiValue ?? null;
    try {
      const data = await api.getHistory(userId, off, PAGE, type);
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

  const handleFilter = (key) => {
    setActiveFilter(key);
    setFilterLoading(true);
    load(0, false, key).finally(() => setFilterLoading(false));
  };

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
      showToast(e.message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <ScreenBg image="/history-bg.jpg" />
        <div className="relative z-10 p-5">
          <h1 className="font-bebas text-white/85 pt-2 mb-4" style={PAGE_HEADING_STYLE}>
            History
          </h1>
          <HistorySkeleton />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <ErrorScreen
        image="/history-bg.jpg"
        onRetry={() => { setError(null); setLoading(true); load(0).finally(() => setLoading(false)); }}
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ScreenBg image="/history-bg.jpg" />
      <div className="relative z-10 p-5">
        <h1 className="font-bebas text-white/85 pt-2 mb-4" style={PAGE_HEADING_STYLE}>
          History
        </h1>

        {/* Filter tabs */}
        <div className="mb-5">
          <Tabs
            tabs={FILTER_TABS.map(f => ({ key: f.key, label: f.label }))}
            activeKey={activeFilter}
            onSelect={handleFilter}
          />
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
                          {fmtWorkoutType(w.type)}
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

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete all history?"
        description="All workouts will be permanently removed."
        primaryLabel="Keep history"
        primaryOnClick={() => setShowDeleteConfirm(false)}
        secondaryLabel="Delete all"
        secondaryOnClick={handleDeleteAll}
        secondaryLoading={deleting}
      />
    </div>
  );
}
