import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Tabs } from '../components/Tabs';
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

  if (loading) {
    return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/workout-bg.jpg" overlay="bg-black/70" />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top overflow-y-auto">
          <h1 className="font-bebas text-white/85 pt-6 mb-4" style={PAGE_HEADING_STYLE}>
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
        image="/workout-bg.jpg"
        onRetry={() => { setError(null); setLoading(true); load(0).finally(() => setLoading(false)); }}
      />
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/workout-bg.jpg" overlay="bg-black/70" />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top overflow-y-auto">
        <h1 className="font-bebas text-white/85 pt-6 mb-4" style={PAGE_HEADING_STYLE}>
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
          <div className="text-center py-16 px-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto mb-4 text-white/25">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12h6M9 16h4"/>
            </svg>
            <p className="font-bebas tracking-wider text-white/80 text-base">No workouts yet</p>
            <p className="font-sans text-white/40 text-sm mt-1.5">Your completed workouts will appear here.</p>
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
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-bebas text-white/92 leading-none text-base tracking-wider">
                            {fmtWorkoutType(w.type)}
                          </span>
                          <span className="font-sans text-white/35 text-xs">{formatDate(w.date)}</span>
                        </div>
                        <div className="font-sans text-white/35 text-xs">
                          {[
                            w.duration_min > 0 && `${w.duration_min} min`,
                            w.total_sets > 0 && `${w.total_sets} set${w.total_sets !== 1 ? 's' : ''}`,
                            w.total_volume > 0 && fmtVol(w.total_volume),
                          ].filter(Boolean).join(', ')}
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

      </div>
    </div>
  );
}
