import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import { ErrorScreen } from '../components/ErrorScreen';
import { PAGE_HEADING_STYLE } from '../shared';
import { ACHIEVEMENT_CATEGORY_ICONS } from '../constants';

function AchievementsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <SkeletonCard key={i} className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

function Badge({ achievement, locked = false }) {
  const { type = 'workouts', name, desc, progress, earned } = achievement;
  const IconComponent = ACHIEVEMENT_CATEGORY_ICONS[type] || ACHIEVEMENT_CATEGORY_ICONS.workouts;
  
  return (
    <div 
      className={`rounded-2xl p-4 ${locked ? 'opacity-50' : ''}`}
      style={{
        background: earned 
          ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)'
          : 'rgba(255,255,255,0.03)',
        border: earned 
          ? '1px solid rgba(255,255,255,0.15)'
          : '1px solid rgba(255,255,255,0.05)',
        boxShadow: earned 
          ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px rgba(255,255,255,0.05)'
          : 'none',
      }}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: earned 
              ? 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)'
              : 'rgba(255,255,255,0.05)',
            color: earned ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
          }}
        >
          {IconComponent}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bebas tracking-wider text-base text-white/90">{name}</div>
          <div className="text-xs text-white/40 font-sans">{desc}</div>
          {!earned && progress > 0 && (
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
              <div className="text-[10px] text-white/30 mt-1 font-sans">{Math.round(progress * 100)}%</div>
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
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top overflow-y-auto">
          <h1 className="font-bebas text-white/85 pt-6 mb-5" style={PAGE_HEADING_STYLE}>
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
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top overflow-y-auto pb-10">
        <h1 className="font-bebas text-white/85 pt-6 mb-0.5" style={PAGE_HEADING_STYLE}>
          Achievements
        </h1>
        {!isEmpty && (
          <div className="text-white/40 text-sm font-sans mb-5">
            {unlocked.length} of {total} unlocked
          </div>
        )}

        {isEmpty ? (
          <div className="text-center py-16 px-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto mb-4 text-white/25">
              <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"/>
              <path d="M6 3h12v6a6 6 0 01-12 0V3zM12 15v4M8 22h8M8 19h8"/>
            </svg>
            <p className="font-bebas tracking-wider text-white/80 text-base">No achievements yet</p>
            <p className="font-sans text-white/40 text-sm mt-1.5">Complete workouts to unlock achievements.</p>
          </div>
        ) : (
          <>
        {/* Unlocked */}
        {unlocked.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-bebas mb-3">Unlocked</div>
            <div className="space-y-3">
              {unlocked.map(ach => (
                <Badge key={ach.id} achievement={ach} />
              ))}
            </div>
          </div>
        )}

        {/* Locked */}
        {locked.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-bebas mb-3">In Progress</div>
            <div className="space-y-3">
              {locked.map(ach => (
                <Badge key={ach.id} achievement={ach} locked />
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
