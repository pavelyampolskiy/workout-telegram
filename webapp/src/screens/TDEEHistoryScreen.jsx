import { useState, useEffect } from 'react';
import { useApp } from '../App';
import ScreenBg from '../ScreenBg';
import { TEXT_MUTED, formatDate } from '../shared';
import { Spinner } from '../components/Spinner';

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/>
  </svg>
);

export default function TDEEHistoryScreen() {
  const { navigate, userId, showToast } = useApp();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    const loadHistory = () => {
      try {
        const historyData = localStorage.getItem(`tdee_history_${userId}`);
        if (historyData) {
          const parsed = JSON.parse(historyData);
          setHistory(parsed.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)));
        }
      } catch (e) {
        console.error('Error loading TDEE history:', e);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [userId]);

  const deleteFromHistory = (id) => {
    try {
      const updatedHistory = history.filter(item => item.id !== id);
      setHistory(updatedHistory);
      localStorage.setItem(`tdee_history_${userId}`, JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Error deleting from history:', e);
      showToast('Error deleting measurement', 'error');
    }
  };

  if (loading) {
    return (
      <>
        <ScreenBg image="/gym-bg.jpg" overlay="bg-black/70" />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-bebas text-white text-2xl pt-6" style={{ letterSpacing: '0.05em' }}>
              TDEE Calculator
            </h1>
          </div>
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenBg image="/gym-bg.jpg" overlay="bg-black/70" />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-bebas text-white text-2xl pt-6" style={{ letterSpacing: '0.05em' }}>
            TDEE Calculator
          </h1>
        </div>
        
        {/* Calculate New Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('tdee')}
            className="w-full px-6 py-4 rounded-xl bg-white/27 hover:bg-white/35 transition-all text-lg font-bebas tracking-wider text-white text-left"
          >
            Calculate New
          </button>
        </div>
        
        {/* History section */}
        <div className="mb-6">
          <h2 className="font-bebas text-white text-lg mb-4" style={{ letterSpacing: '0.05em' }}>
            History
          </h2>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 text-white/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11H3m6 0v6m0-6l-3 3m6-3l3 3m6 0h-6m6 0v6m0-6l3 3m-3-3l-3 3"/>
              </svg>
            </div>
            <h3 className="text-white/60 text-lg font-bebas mb-2">No history yet</h3>
            <p className="text-white/40 text-sm mb-6">Calculate your first TDEE to see your progress</p>
            <button
              onClick={() => navigate('tdee')}
              className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white font-bebas tracking-wider"
            >
              Calculate TDEE
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-xl p-4 text-left"
                style={{ background: 'rgba(255,255,255,0.025)' }}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Дата */}
                    <div className="text-sm text-white/60 mb-2">
                      {formatDate(item.savedAt.split('T')[0])}
                    </div>
                    
                    {/* Калории и цель */}
                    <div className="flex items-center gap-4 mb-2">
                      <div className="text-2xl font-bebas text-white/90">
                        {item.targetCalories?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} kcal
                      </div>
                      <div className="text-sm text-white/60">
                        {item.goal ? (typeof item.goal === 'string' ? item.goal : item.goal.name?.replace(/[^\w\s]/gi, '').trim()) : 'Cutting'}
                      </div>
                    </div>
                    
                    {/* Макроданные */}
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <div className="text-white/40 mb-1">Protein</div>
                        <div className="text-white/90 font-medium">{item.protein?.grams?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}g</div>
                        <div className="text-white/40">{item.protein?.calories} kcal</div>
                      </div>
                      <div>
                        <div className="text-white/40 mb-1">Carbs</div>
                        <div className="text-white/90 font-medium">{item.carbs?.grams?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}g</div>
                        <div className="text-white/40">{item.carbs?.calories} kcal</div>
                      </div>
                      <div>
                        <div className="text-white/40 mb-1">Fats</div>
                        <div className="text-white/90 font-medium">{item.fat?.grams?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}g</div>
                        <div className="text-white/40">{item.fat?.calories} kcal</div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteFromHistory(item.id)}
                    className="shrink-0 p-1 text-white/40 hover:text-red-400 active:text-red-400 transition-colors"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
