import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { TEXT_MUTED, formatDate } from '../shared';

const MetricsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="3" y="13" width="18" height="8" rx="2"/>
    <path d="M6 13V8a6 6 0 0112 0v5"/>
    <circle cx="12" cy="17" r="1"/>
    <path d="M8 17h8"/>
  </svg>
);

const TrendIcon = ({ trend }) => {
  if (trend === 'up') return <span style={{ color: '#10b981' }}>↑</span>;
  if (trend === 'down') return <span style={{ color: '#ef4444' }}>↓</span>;
  return <span style={{ color: '#6b7280' }}>→</span>;
};

export default function BodyMetricsWidget() {
  const { navigate, userId } = useApp();
  const [latestMetrics, setLatestMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    
    // Загрузка последних метрик
    api.getBodyMetrics(userId)
      .then(data => {
        setLatestMetrics(data.latest || null);
      })
      .catch(() => {
        // Fallback на localStorage если API недоступен
        const localMetrics = localStorage.getItem(`body_metrics_${userId}`);
        if (localMetrics) {
          const metrics = JSON.parse(localMetrics);
          setLatestMetrics(metrics[metrics.length - 1] || null);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <button
        className="card-press py-12 pl-8 pr-4 min-h-0 flex flex-row justify-between items-center min-w-0 rounded-xl gap-2 w-full"
        style={{ background: 'rgba(255,255,255,0.03)' }}
        disabled
      >
        <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
          Body Metrics
        </div>
        <div className="px-3 py-1 rounded-lg bg-white/10 border border-transparent">
          <div className="text-xs text-white/40">Loading...</div>
        </div>
      </button>
    );
  }

  // Если нет метрик, показываем виджет с призывом к действию
  if (!latestMetrics) {
    return (
      <button
        onClick={() => navigate('metrics')}
        className="card-press py-12 pl-8 pr-4 min-h-0 flex flex-col justify-start items-start min-w-0 rounded-xl gap-2 w-full"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        {/* Заголовок с иконкой */}
        <div className="flex items-center gap-3 w-full">
          <span className="shrink-0 flex items-center justify-center text-white/25">
            <MetricsIcon />
          </span>
          <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
            Body Metrics
          </div>
        </div>
        
        {/* Внутренняя карточка с призывом */}
        <div className="w-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('metrics');
            }}
            className="w-full px-3 py-2 rounded-lg text-left"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div className="text-xs text-white/60">
              <div className="flex justify-between items-center">
                <span>No measurements yet</span>
                <span style={{ color: '#6b7280' }}>📊</span>
              </div>
              <div className="text-xs text-white/40 mt-1">
                Tap to add first measurement
              </div>
            </div>
          </button>
        </div>
      </button>
    );
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const displayText = latestMetrics.weight 
  return (
    <button
      onClick={() => navigate('metrics')}
      className="card-press py-12 pl-8 pr-4 min-h-0 flex flex-row justify-between items-center min-w-0 rounded-xl gap-2 w-full"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
        Body Metrics
      </div>
      
      <div className="px-3 py-1 rounded-lg bg-white/10 border border-transparent min-w-0 flex-1 text-right">
        <div className="text-xs text-white whitespace-pre-line text-right">
          {latestMetrics?.weight && (
            <div className="text-xs text-white/40 mb-1 text-right">Last measurement</div>
          )}
          {latestMetrics?.weight && <div>Weight: {latestMetrics.weight}kg</div>}
          {latestMetrics?.body_fat && <div>Body Fat: {latestMetrics.body_fat}%</div>}
          {latestMetrics?.muscle_mass && <div>Muscle Mass: {latestMetrics.muscle_mass}kg</div>}
          {latestMetrics?.date && (
            <div className="text-xs text-white/40 mt-1 text-right">
              {formatDate(latestMetrics.date.split('T')[0])}
            </div>
          )}
          {!latestMetrics?.weight && 'No data'}
        </div>
      </div>
    </button>
  );
}
