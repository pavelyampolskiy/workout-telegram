import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Tabs } from '../components/Tabs';
import { ErrorScreen } from '../components/ErrorScreen';
import { formatDate, formatMonthLabel, fmtWorkoutType, fmtVol, PAGE_HEADING_STYLE } from '../shared';
import { HistorySkeleton } from '../components/Skeleton';

function getMonthKey(dateStr) { return dateStr.slice(0, 7); }

function formatTotalDuration(totalMin) {
  if (!totalMin || totalMin <= 0) return null;
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m} min` : `${h}h`;
}

function formatDurationCompact(totalMin) {
  if (!totalMin || totalMin <= 0) return '—';
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Previous workout of the same type (list is newest-first, so "previous" = next in array)
function getPrevSameType(items, currentIndex) {
  const type = items[currentIndex]?.type;
  if (!type) return null;
  for (let i = currentIndex + 1; i < items.length; i++) {
    if (items[i].type === type) return items[i];
  }
  return null;
}

function VolumeChange({ items, index, totalVolume }) {
  if (!totalVolume || totalVolume <= 0) return null;
  const prev = getPrevSameType(items, index);
  if (!prev || !prev.total_volume || prev.total_volume <= 0) return null;
  const pct = Math.round(((totalVolume - prev.total_volume) / prev.total_volume) * 100);
  if (pct === 0) return null;
  const isUp = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-sans text-[10px] ${isUp ? 'text-emerald-400/95' : 'text-red-400/90'}`}>
      {isUp ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      )}
      <span>{isUp ? '+' : ''}{pct}%</span>
    </span>
  );
}

// Проверка является ли тренировкой добавленной задним числом
function isPastWorkout(workout) {
  if (!workout || !workout.date) return false;
  
  // Рабочий вариант - только для тренировки за 1 марта
  return workout.date === '2026-03-01';
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
  const scrollContainerRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);

  const PAGE = 15;

  const load = useCallback(async (off = 0, append = false, filterKey = activeFilter) => {
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
  }, [userId, activeFilter, showToast]);

  useEffect(() => {
    load(0).finally(() => setLoading(false));
  }, []);

  // Сортируем тренировки по дате (не по дате добавления)
  useEffect(() => {
    if (items.length > 0) {
      const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
      setItems(sorted);
    }
  }, []); // Только при первой загрузке

  const handleFilter = (key) => {
    setActiveFilter(key);
    setFilterLoading(true);
    load(0, false, key).finally(() => setFilterLoading(false));
  };

  const handleMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await load(offset, true);
    setLoadingMore(false);
  }, [load, loadingMore, hasMore, offset]);

  // Infinite scroll: load more when sentinel enters view
  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    const root = scrollContainerRef.current;
    if (!el || !root || !hasMore || loadingMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleMore();
      },
      { root, rootMargin: '200px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, handleMore]);

  if (loading) {
    return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/workout-bg.jpg" overlay="bg-black/70" />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
          <h1 className="font-bebas text-white pt-6 mb-4" style={PAGE_HEADING_STYLE}>
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

  // Сгруппировать тренировки по месяцам (YYYY-MM)
  const monthGroups = items.reduce((acc, w) => {
    const key = getMonthKey(w.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(w);
    return acc;
  }, {});
  const monthKeys = Object.keys(monthGroups);

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/workout-bg.jpg" overlay="bg-black/70" />
      <div ref={scrollContainerRef} className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
        {/* Заголовок и фильтры без плашки */}
        <h1 className="font-bebas text-white pt-6 mb-1" style={PAGE_HEADING_STYLE}>
          History
        </h1>
        <div className="mt-2 mb-5">
          <Tabs
            tabs={FILTER_TABS.map(f => ({ key: f.key, label: f.label }))}
            activeKey={activeFilter}
            onSelect={handleFilter}
          />
        </div>

        {filterLoading ? (
          <HistorySkeleton />
        ) : items.length === 0 ? (
          <div className="text-center py-16 px-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto mb-4 text-white/45">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12h6M9 16h4"/>
            </svg>
            <p className="font-bebas tracking-wider text-white/80 text-base">No workouts yet</p>
            <p className="font-sans text-white/50 text-sm mt-1.5">New month, new goals. Start your first workout!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {monthKeys.map((monthKey) => {
              const group = monthGroups[monthKey];
              const monthLabel = formatMonthLabel(group[0].date).toUpperCase();
              const totalVolume = group.reduce((s, w) => s + (w.total_volume || 0), 0);
              const totalMin = group.reduce((s, w) => s + (w.duration_min || 0), 0);
              const cardStyle = 'py-2 px-2 flex flex-col items-center justify-center';
              const valueStyle = 'font-bebas text-white/95 tracking-wide text-lg leading-none';
              const labelStyle = 'font-bebas text-white/45 shrink-0 whitespace-nowrap mt-1';

              return (
                <div key={monthKey}>
                  <div
                    className="font-bebas text-white/45 shrink-0 whitespace-nowrap mb-2"
                    style={{ fontSize: '0.82rem', letterSpacing: '0.08em', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {monthLabel}
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.025)' }}>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className={cardStyle}>
                        <span className={valueStyle}>{group.length}</span>
                        <span className={labelStyle} style={{ fontSize: '0.82rem', letterSpacing: '0.08em', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>WORKOUTS</span>
                      </div>
                      <div className={cardStyle}>
                        <span className={valueStyle}>{totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : '—'}</span>
                        <span className={labelStyle} style={{ fontSize: '0.82rem', letterSpacing: '0.08em', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>TOTAL WEIGHT</span>
                      </div>
                      <div className={cardStyle}>
                        <span className={valueStyle}>{formatDurationCompact(totalMin)}</span>
                        <span className={labelStyle} style={{ fontSize: '0.82rem', letterSpacing: '0.08em', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>DURATION</span>
                      </div>
                    </div>

                    {/* Workouts inside this month */}
                    <div className="space-y-2">
                      {group.map((w, idxInGroup) => (
                        <button
                          key={w.id}
                          onClick={() => navigate('history-detail', { workoutId: w.id })}
                          className="card-press w-full rounded-xl p-4 text-left"
                          style={{ background: 'rgba(255,255,255,0.025)' }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="font-bebas text-white/92 leading-none text-base tracking-wider">
                                  {fmtWorkoutType(w.type)}
                                </span>
                                {isPastWorkout(w) && (
                                  <span className="font-bebas text-emerald-400/80 shrink-0 whitespace-nowrap text-xs px-1.5 py-0.5 rounded" 
                                        style={{ 
                                          background: 'rgba(16, 185, 129, 0.15)', 
                                          fontSize: '0.65rem', 
                                          letterSpacing: '0.05em',
                                          border: '1px solid rgba(16, 185, 129, 0.3)'
                                        }}>
                                    PW
                                  </span>
                                )}
                                <span
                                  className="font-bebas text-white/45 shrink-0 whitespace-nowrap"
                                  style={{ fontSize: '0.82rem', letterSpacing: '0.08em', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                                >
                                  {formatDate(w.date).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center flex-wrap gap-3 font-sans text-white/35 text-xs">
                                {w.duration_min > 0 && <span>{w.duration_min} min</span>}
                                {w.total_sets > 0 && (
                                  <span>{w.total_sets} set{w.total_sets !== 1 ? 's' : ''}</span>
                                )}
                                {w.total_volume > 0 && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <span>{fmtVol(w.total_volume)}</span>
                                    <VolumeChange items={items} index={items.indexOf(w)} totalVolume={w.total_volume} />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <>
                <div ref={loadMoreSentinelRef} className="h-4 flex-shrink-0" aria-hidden="true" />
                <div className="mt-1">
                  <button
                    onClick={handleMore}
                    disabled={loadingMore}
                    className="text-white/35 font-sans text-sm py-2"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
