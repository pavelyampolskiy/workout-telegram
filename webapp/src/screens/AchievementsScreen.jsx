import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { AchievementsSkeleton } from '../components/Skeleton';
import { ErrorScreen } from '../components/ErrorScreen';
import { PAGE_HEADING_STYLE } from '../shared';
import { ACHIEVEMENT_CATEGORY_ICONS } from '../constants';

function Badge({ achievement, locked = false }) {
  const { type = 'workouts', name, desc, progress, earned } = achievement;
  const IconComponent = ACHIEVEMENT_CATEGORY_ICONS[type] || ACHIEVEMENT_CATEGORY_ICONS.workouts;

  return (
    <div>
      <div className="flex items-center gap-4">
        <span
          className="shrink-0 flex items-center justify-center"
          style={{ color: earned ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.34)' }}
        >
          {IconComponent}
        </span>
        <div className="flex-1 min-w-0">
          <div className={`font-bebas tracking-wider text-base ${locked ? 'text-white/40' : 'text-white'}`}>{name}</div>
          <div className={`text-xs font-sans ${locked ? 'text-white/15' : 'text-white/40'}`}>{desc}</div>
          {!earned && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress * 100}%`,
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 100%)',
                  }}
                />
              </div>
              <div className={`text-[10px] mt-1 font-sans ${locked ? 'text-white/10' : 'text-white/30'}`}>{Math.round(progress * 100)}%</div>
            </div>
          )}
        </div>
        {earned && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white/70 shrink-0">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        )}
      </div>
    </div>
  );
}

export default function AchievementsScreen() {
  const { userId, goBack, showToast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getAchievements(userId)
      .then(setData)
      .catch(e => { setError(e.message); showToast(e.message); })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/workout-bg.jpg" />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto max-w-lg mx-auto w-full">
          <h1 className="font-bebas text-white pt-6 mb-5" style={PAGE_HEADING_STYLE}>
            Achievements
          </h1>
          <AchievementsSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorScreen
        onBack={goBack}
        onRetry={() => {
          setError(null);
          setLoading(true);
          api.getAchievements(userId).then(setData).catch(e => { setError(e.message); showToast(e.message); }).finally(() => setLoading(false));
        }}
      />
    );
  }

  const { unlocked, locked } = data;
  const total = unlocked.length + locked.length;
  const isEmpty = total === 0;

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/workout-bg.jpg" />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto pb-10 max-w-lg mx-auto w-full">
        {isEmpty ? (
          <>
            <h1 className="font-bebas text-white pt-6 mb-0.5" style={PAGE_HEADING_STYLE}>
              Achievements
            </h1>
            <div className="text-center py-16 px-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto mb-4 text-white/25">
                <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"/>
                <path d="M6 3h12v6a6 6 0 01-12 0V3zM12 15v4M8 22h8M8 19h8"/>
              </svg>
              <p className="font-bebas tracking-wider text-white/80 text-base">No achievements yet</p>
              <p className="font-sans text-white/40 text-sm mt-1.5">Complete workouts to unlock achievements.</p>
            </div>
          </>
        ) : (
          <>
            {/* Page title + counter — тот же уровень, что History/Statistics */}
            <h1 className="font-bebas text-white pt-6 mb-2" style={PAGE_HEADING_STYLE}>
              Achievements
            </h1>

            {/* Unlocked — каждая цель отдельной плашкой, яркость +25% к базовой */}
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-bebas mb-2">Unlocked</div>
            {unlocked.length > 0 ? (
              <div className="space-y-2 mb-4">
                {unlocked.map(ach => (
                  <div key={ach.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03125)' }}>
                    <Badge achievement={ach} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03125)' }}>
                <p className="text-white/30 text-sm font-sans">None yet</p>
              </div>
            )}

            {/* In Progress — каждая цель отдельной плашкой */}
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-bebas mb-2">In Progress</div>
            {locked.length > 0 ? (
              <div className="space-y-2">
                {locked.map(ach => (
                  <div key={ach.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.025)' }}>
                    <Badge achievement={ach} locked />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.025)' }}>
                <p className="text-white/30 text-sm font-sans">None</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
