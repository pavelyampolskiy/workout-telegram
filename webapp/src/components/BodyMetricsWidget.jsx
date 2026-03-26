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
        className="card-press py-8 pl-8 pr-4 min-h-[100px] flex flex-col justify-start items-start min-w-0 rounded-xl gap-2 w-full"
        style={{ background: 'rgba(255,255,255,0.03)' }}
        disabled
      >
        {/* Заголовок */}
        <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
          Body Metrics
        </div>
        
        {/* Плашка с загрузкой */}
        <div className="w-full px-3 py-2 rounded-lg text-left" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="text-xs text-white/40">
            Loading...
          </div>
        </div>
      </button>
    );
  }

  // Если нет метрик, показываем виджет с призывом к действию
  if (!latestMetrics) {
    return (
      <button
        onClick={() => navigate('metrics')}
        className="card-press py-8 pl-8 pr-4 min-h-[100px] flex flex-col justify-start items-start min-w-0 rounded-xl gap-2 w-full"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        {/* Заголовок */}
        <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
          Body Metrics
        </div>
        
        {/* Плашка с сообщением */}
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
      </button>
    );
  }

  const displayText = latestMetrics.weight 
  return (
    <button
      onClick={() => navigate('metrics')}
      className="card-press py-8 pl-8 pr-4 min-h-[100px] flex flex-col justify-start items-start min-w-0 rounded-xl gap-2 w-full"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Заголовок */}
      <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
        Body Metrics
      </div>
      
      {/* Плашка с данными */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate('metrics');
        }}
        className="w-full px-3 py-2 rounded-lg text-left"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {/* Дата последнего измерения */}
        {latestMetrics?.weight && (
          <div className="text-xs text-white/40 mb-1">
            {formatDate(latestMetrics.date.split('T')[0])}
          </div>
        )}
        
        {/* Параметры каждый на новой строке */}
        {latestMetrics?.weight && (
          <div className="space-y-1 text-xs text-white">
            <div>Weight: {latestMetrics.weight}kg</div>
            {latestMetrics?.body_fat && <div>Body Fat: {latestMetrics.body_fat}%</div>}
            {latestMetrics?.muscle_mass && <div>Muscle: {latestMetrics.muscle_mass}kg</div>}
          </div>
        )}
        
        {!latestMetrics?.weight && (
          <div className="text-xs text-white/60">
            No measurements yet
          </div>
        )}
      </button>
    </button>
  );
}
