import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { ErrorScreen } from '../components/ErrorScreen';
import { LoadingScreen } from '../components/LoadingScreen';
import { PAGE_HEADING_STYLE, CARD_BTN_STYLE } from '../shared';

export default function AICoachScreen() {
  const { userId, goBack, showToast } = useApp();
  const [muscleBalance, setMuscleBalance] = useState(null);
  const [plateaus, setPlateaus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalysis = async () => {
    try {
      setRefreshing(true);
      const [balanceResponse, plateauResponse] = await Promise.all([
        api.getMuscleBalance(4),
        api.getPlateauDetection(4)
      ]);

      setMuscleBalance(balanceResponse);
      setPlateaus(plateauResponse);
      setError(null);
    } catch (e) {
      setError(e.message);
      showToast(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
          <h1 className="font-bebas text-white pt-6 mb-5" style={PAGE_HEADING_STYLE}>AI Coach</h1>
          <LoadingScreen />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorScreen
        image="/gym-bg.jpg"
        onBack={goBack}
        onRetry={() => { setError(null); setLoading(true); loadAnalysis(); }}
      />
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-bebas text-white pt-6" style={PAGE_HEADING_STYLE}>AI Coach</h1>
          <button
            onClick={loadAnalysis}
            disabled={refreshing}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>

        {/* Muscle Group Balance */}
        {muscleBalance && (
          <div className="mb-6">
            <div className="rounded-2xl p-4 mb-4" style={CARD_BTN_STYLE}>
              <h2 className="text-white/90 text-lg font-bebas tracking-wider mb-3">Muscle Group Balance</h2>
              
              {muscleBalance.status === 'no_data' ? (
                <p className="text-white/60 text-sm font-bebas">{muscleBalance.message}</p>
              ) : (
                <>
                  {/* Muscle Groups Progress */}
                  <div className="space-y-3 mb-4">
                    {Object.entries(muscleBalance.muscle_groups).map(([group, data]) => (
                      <div key={group} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bebas tracking-wider">{group}</span>
                            <span className={`text-xs px-2 py-1 rounded font-bebas ${
                              data.progress_percent > 10 ? 'bg-green-500/20 text-green-400' :
                              data.progress_percent > 5 ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {muscleBalance.progress_rates[group]}
                            </span>
                          </div>
                          <div className="text-white/40 text-sm font-bebas">
                            +{data.progress_kg.toFixed(1)}kg ({data.progress_percent.toFixed(1)}%)
                          </div>
                        </div>
                        <div className="text-white/60 text-sm font-bebas">
                          {data.current_weight.toFixed(1)}kg
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendation */}
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 text-lg">💡</span>
                      <p className="text-white/80 text-sm font-bebas leading-relaxed">
                        {muscleBalance.recommendation}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Plateau Detection */}
        {plateaus && (
          <div className="mb-6">
            <div className="rounded-2xl p-4" style={CARD_BTN_STYLE}>
              <h2 className="text-white/90 text-lg font-bebas tracking-wider mb-3">Plateau Detection</h2>
              
              {plateaus.status === 'no_plateaus' ? (
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-lg">✅</span>
                  <p className="text-white/60 text-sm font-bebas">{plateaus.message}</p>
                </div>
              ) : (
                <>
                  <div className="mb-2">
                    <span className="text-orange-400 text-sm font-bebas">
                      ⚠️ {plateaus.total_plateaus} plateau{plateaus.total_plateaus !== 1 ? 's' : ''} detected
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {plateaus.plateaus.map((plateau, index) => (
                      <div key={index} className="bg-white/5 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-bebas tracking-wider">{plateau.exercise}</span>
                          <span className="text-orange-400 text-sm font-bebas">
                            {plateau.stalled_weeks} weeks
                          </span>
                        </div>
                        <div className="text-white/60 text-sm font-bebas mb-2">
                          Current: {plateau.current_weight.toFixed(1)}kg
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 text-sm">🎯</span>
                          <p className="text-white/70 text-xs font-bebas leading-relaxed">
                            {plateau.recommendation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="rounded-2xl p-4 bg-white/[0.02] border border-white/10">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 text-xl">🤖</span>
            <div>
              <h3 className="text-white/90 text-sm font-bebas tracking-wider mb-1">AI Coach Insights</h3>
              <p className="text-white/50 text-xs font-bebas leading-relaxed">
                AI analysis based on your last 4 weeks of training data. 
                Recommendations update automatically as you progress.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
