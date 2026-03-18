import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { TEXT_MUTED } from '../shared';

const SupplementsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M9 2v6M15 2v6M7 8h10M7 8v10a2 2 0 002 2h2a2 2 0 002-2V8M7 8l-2 4h14l-2-4"/>
  </svg>
);

export default function SupplementsWidget() {
  const { navigate, userId } = useApp();
  const [activeSupplements, setActiveSupplements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    api.getActiveSupplements(userId)
      .then(data => {
        setActiveSupplements(data.names || []);
      })
      .catch(() => {
        setActiveSupplements([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-xl p-4 w-full mt-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="shrink-0 flex items-center justify-center text-white/20">
              <SupplementsIcon />
            </div>
            <span className="font-bebas text-white/20 text-sm" style={{ letterSpacing: '0.08em' }}>
              Loading...
            </span>
          </div>
        </div>
      </div>
    );
  }

  const hasSupplements = activeSupplements.length > 0;
  const displayText = hasSupplements 
    ? activeSupplements.slice(0, 3).join(', ')
    : 'Supplements';

  return (
    <button
      onClick={() => navigate('supplements')}
      className="card-press rounded-xl p-4 w-full mt-4 text-left"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="shrink-0 flex items-center justify-center text-white/25">
            <SupplementsIcon />
          </div>
          <div className="flex-1 min-w-0">
            <div 
              className={`font-bebas truncate ${hasSupplements ? 'text-white/60' : TEXT_MUTED}`}
              style={{ 
                fontSize: hasSupplements ? '0.9rem' : '0.85rem', 
                letterSpacing: '0.08em',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
              }}
            >
              {displayText}
            </div>
            {hasSupplements && (
              <div className={`font-bebas text-xs ${TEXT_MUTED} mt-1`} style={{ letterSpacing: '0.05em' }}>
                Active supplements
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 text-white/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    </button>
  );
}
