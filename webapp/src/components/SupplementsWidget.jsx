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
        <span className="shrink-0 flex items-center justify-center text-white/25">
          <SupplementsIcon />
        </span>
        <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
          Loading...
        </div>
      </button>
    );
  }

  const hasSupplements = activeSupplements.length > 0;
  const displayText = hasSupplements 
    ? activeSupplements.slice(0, 3).join(', ')
    : 'Supplements';

  return (
    <button
      onClick={() => navigate('supplements')}
      className="card-press py-12 pl-8 pr-4 min-h-0 flex flex-row justify-between items-center min-w-0 rounded-xl gap-2 w-full mt-4"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <span className="shrink-0 flex items-center justify-center text-white/25">
        <SupplementsIcon />
      </span>
      <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
        {hasSupplements ? activeSupplements.slice(0, 3).join(', ') : 'Supplements'}
      </div>
    </button>
  );
}
