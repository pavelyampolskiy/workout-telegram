import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { TEXT_MUTED } from '../shared';

const SupplementsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
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
        className="card-press py-8 pl-8 pr-4 min-h-[100px] flex flex-col justify-start items-start min-w-0 rounded-xl gap-2 w-full"
        style={{ background: 'rgba(255,255,255,0.03)' }}
        disabled
      >
        {/* Заголовок */}
        <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
          Current supplements
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

  const hasSupplements = activeSupplements.length > 0;
  let displayText = '';
  
  if (hasSupplements) {
    if (activeSupplements.length <= 4) {
      displayText = activeSupplements.join('\n');
    } else {
      // Показываем первые 4 и количество остальных
      displayText = `${activeSupplements.slice(0, 4).join('\n')}\n+${activeSupplements.length - 4} more`;
    }
  }

  // Если нет добавок, показываем плейсхолдер
  if (!hasSupplements) {
    return (
      <button
        onClick={() => navigate('supplements')}
        className="card-press py-8 pl-8 pr-4 min-h-[100px] flex flex-col justify-start items-start min-w-0 rounded-xl gap-2 w-full"
        style={{ background: 'none' }}
      >
        {/* Заголовок */}
        <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
          Current supplements
        </div>
        
        {/* Данные на одном уровне с заголовком */}
        <div className="w-full pl-0 py-2 rounded-lg text-left" style={{ background: 'none' }}>
          <div className="flex flex-col items-center justify-center text-center py-4">
            <div className="w-8 h-8 mb-2 text-white/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="12" rx="8" ry="5" transform="rotate(15 12 12)"/>
                <path d="M12 7v10M8 9l8 0M8 15l8 0"/>
              </svg>
            </div>
            <div className="text-xs text-white/40">
              Ещё нет добавок
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate('supplements')}
      className="card-press py-8 pl-8 pr-4 min-h-[100px] flex flex-col justify-start items-start min-w-0 rounded-xl gap-2 w-full"
      style={{ background: 'none' }}
    >
      {/* Заголовок */}
      <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
        Current supplements
      </div>
      
      {/* Данные на одном уровне с заголовком */}
      <div className="w-full pl-0 py-2 rounded-lg text-left" style={{ background: 'none' }}>
        <div className="text-xs text-white/92 whitespace-pre-line max-h-[80px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {displayText}
        </div>
      </div>
    </button>
  );
}
