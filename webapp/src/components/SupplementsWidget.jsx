import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { TEXT_MUTED } from '../shared';

const SupplementsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <ellipse cx="12" cy="12" rx="8" ry="5" transform="rotate(15 12 12)"/>
    <path d="M12 7v10M8 9l8 0M8 15l8 0"/>
  </svg>
);

export default function SupplementsWidget() {
  const { navigate, userId } = useApp();
  const [activeSupplements, setActiveSupplements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    
    // Сначала пробуем загрузить с сервера
    api.getActiveSupplements(userId)
      .then(data => {
        setActiveSupplements(data.names || []);
      })
      .catch(() => {
        // Если сервер недоступен, загружаем из localStorage
        const localSupplements = localStorage.getItem(`supplements_${userId}`);
        if (localSupplements) {
          const supplements = JSON.parse(localSupplements);
          const supplementNames = supplements.map(s => s.name);
          setActiveSupplements(supplementNames);
        } else {
          setActiveSupplements([]);
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
          Current supplements
        </div>
        <div className="px-3 py-1 rounded-lg bg-white/10 border border-transparent">
          <div className="text-xs text-white/40">Loading...</div>
        </div>
      </button>
    );
  }

  const hasSupplements = activeSupplements.length > 0;
  let displayText = '';
  
  if (hasSupplements) {
    if (activeSupplements.length <= 3) {
      displayText = activeSupplements.join('\n');
    } else {
      displayText = `${activeSupplements.slice(0, 3).join('\n')} +${activeSupplements.length - 3}`;
    }
  }

  // Если нет добавок, не показываем кнопку совсем
  if (!hasSupplements) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Заголовок */}
      <div className="flex items-center gap-3">
        <span className="shrink-0 flex items-center justify-center text-white/25">
          <SupplementsIcon />
        </span>
        <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
          Current supplements
        </div>
      </div>
      
      {/* Плашка с добавками */}
      <button
        onClick={() => navigate('supplements')}
        className="card-press w-full px-4 py-3 rounded-xl text-left"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <div className="text-xs text-white/60 whitespace-pre-line">
          {displayText}
        </div>
      </button>
    </div>
  );
}
