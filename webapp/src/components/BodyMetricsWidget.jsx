import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';

export default function BodyMetricsWidget() {
  const { navigate, userId } = useApp();
  const [latestMetrics, setLatestMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    Promise.all([
      api.getBodyMetrics(userId).catch(() => null),
      api.getBodyMetricsReminder(userId).catch(() => null),
    ]).then(([metrics, reminder]) => {
      if (Array.isArray(metrics) && metrics.length > 0) {
        setLatestMetrics(metrics[0]);
      } else {
        const local = localStorage.getItem(`body_metrics_${userId}`);
        if (local) {
          const arr = JSON.parse(local);
          setLatestMetrics(arr[arr.length - 1] || null);
        }
      }
      if (reminder) setShowReminder(reminder.show_reminder);
    }).finally(() => setLoading(false));
  }, [userId]);

  const glowStyle = showReminder ? {
    boxShadow: '0 0 12px 2px rgba(251, 191, 36, 0.35), inset 0 0 8px rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.4)',
  } : {};

  if (loading) {
    return (
      <div
        className="py-8 pl-8 pr-4 min-h-[100px] flex flex-col justify-start items-start min-w-0 rounded-xl gap-2 w-full"
        style={{ background: 'none' }}
      >
        <div className="font-bebas text-base text-white/45 shrink-0" style={{ letterSpacing: 'normal' }}>
          Body Metrics
        </div>
        <div className="text-xs text-white/40">Loading...</div>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate('metrics')}
      className="card-press py-8 pl-8 pr-4 min-h-[100px] flex flex-col justify-start items-start min-w-0 rounded-xl gap-2 w-full"
      style={{ background: 'none', ...glowStyle }}
    >
      <div className="flex items-center gap-2">
        <div className="font-bebas text-base text-white/45 shrink-0" style={{ letterSpacing: 'normal' }}>
          Body Metrics
        </div>
        {showReminder && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        )}
      </div>

      {latestMetrics?.weight ? (
        <div className="w-full pl-0 py-2 rounded-lg text-left" style={{ background: 'none' }}>
          <div className="space-y-1 text-xs text-white">
            <div>Weight: {latestMetrics.weight}kg</div>
            {latestMetrics.body_fat != null && <div>Body Fat: {latestMetrics.body_fat}%</div>}
            {latestMetrics.muscle_mass != null && <div>Muscle: {latestMetrics.muscle_mass}kg</div>}
          </div>
        </div>
      ) : (
        <div className="w-full pl-0 py-2 text-left">
          <div className="text-xs text-white/40 py-4">
            {showReminder ? 'Time to weigh in!' : 'Tap to add first measurement'}
          </div>
        </div>
      )}
    </button>
  );
}
