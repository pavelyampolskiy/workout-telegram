import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

function dayLabel(type) {
  if (type === 'CARDIO') return '❤️ Cardio';
  return type.replace('DAY_', 'Day ');
}

function dayColor(type) {
  if (type === 'CARDIO') return 'text-red-400 bg-red-900/30';
  if (type === 'DAY_A') return 'text-blue-400 bg-blue-900/30';
  if (type === 'DAY_B') return 'text-purple-400 bg-purple-900/30';
  return 'text-green-400 bg-green-900/30';
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
      <h1 className="text-xl font-bold pt-2 mb-5">History</h1>

      {items.length === 0 ? (
        <div className="text-center text-slate-500 py-16">
          <div className="text-5xl mb-3">📋</div>
          <p>No workouts yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(w => (
            <button
              key={w.id}
              onClick={() => navigate('history-detail', { workoutId: w.id })}
              className="w-full bg-slate-800 active:bg-slate-700 rounded-2xl p-4 text-left flex items-center gap-3 transition-colors"
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
              className="w-full mt-2 py-3 text-blue-400 text-sm font-medium"
            >
              {loadingMore ? 'Loading…' : '🔄 Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
