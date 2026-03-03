import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

function dayLabel(type) {
  if (type === 'CARDIO') return 'Cardio';
  return type.replace('DAY_', 'Day ');
}

function dayColor(type) {
  return 'text-white bg-white/15';
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
    return <div className="flex items-center justify-center h-screen text-slate-400">Loading…</div>;
  }

  if (error) {
    return <div className="p-5 text-center text-red-400 pt-20">{error}</div>;
  }

  return (
    <div className="p-5">
      <h1 className="text-xl font-bebas tracking-wider pt-2 mb-5">History</h1>

      {items.length === 0 ? (
        <div className="text-center text-slate-500 py-16">
          <div className="flex justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12h6M9 16h4"/>
            </svg>
          </div>
          <p>No workouts yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(w => (
            <button
              key={w.id}
              onClick={() => navigate('history-detail', { workoutId: w.id })}
              className="w-full bg-white/10 backdrop-blur-sm active:bg-white/20 border border-white/10 rounded-2xl p-4 text-left flex items-center gap-3 transition-colors"
            >
              <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${dayColor(w.type)}`}>
                {dayLabel(w.type)}
              </span>
              <span className="text-slate-300 text-sm font-mono flex-1">{w.date}</span>
              <span className="text-slate-600 text-lg shrink-0">›</span>
            </button>
          ))}

          {hasMore && (
            <button
              onClick={handleMore}
              disabled={loadingMore}
              className="w-full mt-2 py-3 text-slate-400 text-sm font-medium"
            >
              {loadingMore ? 'Loading…' : (
                <span className="flex items-center justify-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M1 4v6h6M23 20v-6h-6"/>
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/>
                  </svg>
                  Load more
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
