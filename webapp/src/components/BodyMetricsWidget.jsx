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
        style={{ background: 'none' }}
        disabled
      >
        {/* Заголовок */}
        <div className="font-bebas text-base text-white/45 shrink-0" style={{ letterSpacing: 'normal' }}>
          Body Metrics
        </div>
        
        {/* Плашка с загрузкой */}
        <div className="w-full px-3 py-2 rounded-lg text-left" style={{ background: 'none' }}>
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
        style={{ background: 'none' }}
      >
        {/* Заголовок */}
        <div className="font-bebas text-base text-white/45 shrink-0" style={{ letterSpacing: 'normal' }}>
          Body Metrics
        </div>
        
        <div className="w-full pl-0 py-2 rounded-lg text-left" style={{ background: 'none' }}>
          <div className="flex flex-col items-start justify-center py-4">
            <div className="text-xs text-white/40">
              Tap to add first measurement
            </div>
          </div>
        </div>
      </button>
    );
  }

  const displayText = latestMetrics.weight 
  return (
    <button
      onClick={() => navigate('metrics')}
      className="card-press py-8 pl-8 pr-4 min-h-[100px] flex flex-col justify-start items-start min-w-0 rounded-xl gap-2 w-full"
      style={{ background: 'none' }}
    >
      {/* Заголовок */}
      <div className="font-bebas text-base text-white/45 shrink-0" style={{ letterSpacing: 'normal' }}>
        Body Metrics
      </div>
      
      {/* Данные на одном уровне с заголовком */}
      <div className="w-full pl-0 py-2 rounded-lg text-left" style={{ background: 'none' }}>
        {/* Параметры каждый на новой строке */}
        {latestMetrics?.weight && (
          <div className="space-y-1 text-xs text-white">
            <div>Weight: {latestMetrics.weight}kg</div>
            {latestMetrics?.body_fat && <div>Body Fat: {latestMetrics.body_fat}%</div>}
            {latestMetrics?.muscle_mass && <div>Muscle: {latestMetrics.muscle_mass}kg</div>}
          </div>
        )}
        
        {!latestMetrics?.weight && (
          <div className="w-full pl-0 py-2 rounded-lg text-left" style={{ background: 'none' }}>
            <div className="flex flex-col items-start justify-center py-4">
              <div className="text-xs text-white/40">
                Tap to add first measurement
              </div>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
