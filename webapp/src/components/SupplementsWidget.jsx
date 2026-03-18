import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { TEXT_MUTED } from '../shared';

const SupplementsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M8 2v2M16 2v2M7 4h10M7 4v12a2 2 0 002 2h2a2 2 0 002-2V4M7 4l-1 3h12l-1-3"/>
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
        className="card-press py-12 pl-8 pr-4 min-h-0 flex flex-row justify-between items-center min-w-0 rounded-xl gap-2 w-full mt-4"
        style={{ background: 'rgba(255,255,255,0.03)' }}
        disabled
      >
        <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
          Current supplements
        </div>
        <div className="px-3 py-1 rounded-lg bg-white/10 border border-white/20">
          <div className="text-xs text-white/40">Loading...</div>
        </div>
      </button>
    );
  }

  const hasSupplements = activeSupplements.length > 0;
  let displayText = 'None';
  
  if (hasSupplements) {
    if (activeSupplements.length <= 3) {
      displayText = activeSupplements.join(', ');
    } else {
      displayText = `${activeSupplements.slice(0, 2).join(', ')}, +${activeSupplements.length - 2}`;
    }
  }

  return (
    <button
      onClick={() => navigate('supplements')}
      className="card-press py-12 pl-8 pr-4 min-h-0 flex flex-row justify-between items-center min-w-0 rounded-xl gap-2 w-full mt-4"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
        Current supplements
      </div>
      <div className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 min-w-0 flex-1 text-right">
        <div className="text-xs text-white/60 truncate">
          {displayText}
        </div>
      </div>
    </button>
  );
}
