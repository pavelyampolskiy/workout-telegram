import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { TEXT_MUTED } from '../shared';

export default function TDEEWidget() {
  const { navigate, userId } = useApp();
  const [tdeeData, setTdeeData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load saved TDEE data
  useEffect(() => {
    if (!userId) return;
    
    try {
      const saved = localStorage.getItem(`tdee_data_${userId}`);
      if (saved) {
        const data = JSON.parse(saved);
        setTdeeData(data);
      }
    } catch (e) {
      console.error('Error loading TDEE data:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  if (loading) {
    return (
      <button
        className="btn-active-style card-press py-12 pl-8 pr-4 min-h-0 flex flex-row justify-between items-center min-w-0 rounded-xl gap-2 w-full"
        style={{ background: 'rgba(255,255,255,0.03)' }}
        disabled
      >
        <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
          TDEE
        </div>
        <div className="px-3 py-1 rounded-lg bg-white/10 border border-transparent">
          <div className="text-xs text-white/40">Loading...</div>
        </div>
      </button>
    );
  }

  // If no TDEE data, show call to action
  if (!tdeeData) {
    return (
      <button
        onClick={() => navigate('tdee')}
        className="btn-active-style card-press w-full h-full flex flex-col justify-center items-center p-4"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        {/* Header with title only */}
        <div className="w-full text-center">
          <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
            TDEE
          </div>
        </div>
        
        {/* Call to action */}
        <div className="w-full flex-1 flex flex-col justify-center items-center">
          <div className="text-center">
            <div className="px-4 py-2 rounded-lg bg-white/10 border border-white/20">
              <span className="text-xs font-bebas tracking-wider">CALCULATE</span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  // Show TDEE results summary
  return (
    <button
      onClick={() => navigate('tdee')}
      className="btn-active-style card-press w-full h-full flex flex-col justify-center items-center p-4"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Header */}
      <div className="w-full text-center mb-2">
        <div className="font-bebas text-base text-white/25 shrink-0" style={{ letterSpacing: 'normal' }}>
          TDEE
        </div>
      </div>

      {/* Main calories display */}
      <div className="w-full flex-1 flex flex-col justify-center items-center">
        <div className="text-center mb-2">
          <div className="text-2xl font-bebas tracking-wider text-white/90 mb-1">
            {tdeeData.targetCalories?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} kcal per day
          </div>
          {/* Temporary debug - always show badge */}
          <div className="inline-block px-2 py-1 rounded bg-white/10 border border-white/20">
            <span className="text-xs font-bebas tracking-wider text-white/70">
              {tdeeData.goal ? (typeof tdeeData.goal === 'string' ? tdeeData.goal : tdeeData.goal.name?.replace(/[^\w\s]/gi, '').trim()) : 'Cutting'}
            </span>
          </div>
        </div>
        
        {/* Quick macro stats */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
        >
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-xs text-white/40">Protein</div>
              <div className="text-xs text-white/90 font-medium">
                {tdeeData.protein?.grams?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}g
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/40">Carbohydrates</div>
              <div className="text-xs text-white/90 font-medium">
                {tdeeData.carbs?.grams?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}g
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/40">Fats</div>
              <div className="text-xs text-white/90 font-medium">
                {tdeeData.fat?.grams?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}g
              </div>
            </div>
          </div>
        </button>
      </div>
    </button>
  );
}
