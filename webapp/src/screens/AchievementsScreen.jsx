import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Skeleton, SkeletonCard } from '../components/Skeleton';

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
  const { icon, name, desc, progress, earned } = achievement;
  
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
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{
            background: earned 
              ? 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)'
              : 'rgba(255,255,255,0.05)',
          }}
        >
          {icon}
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
          <div className="text-green-400/80 text-lg">✓</div>
        )}
      </div>
    </div>
  );
}

export default function AchievementsScreen() {
  const { userId } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getAchievements(userId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <ScreenBg />
        <div className="relative z-10 p-5">
          <h1 className="font-bebas text-white/85 pt-2 mb-5" style={{ fontSize: '6vw', letterSpacing: '0.1em' }}>
            Achievements
          </h1>
          <AchievementsSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <ScreenBg />
        <div className="relative z-10 flex items-center justify-center h-screen text-red-400/80 font-bebas tracking-wider p-5 text-center">
          {error}
        </div>
      </div>
    );
  }

  const { unlocked, locked } = data;

  return (
    <div className="min-h-screen relative overflow-hidden pb-10">
      <ScreenBg />
      <div className="relative z-10 p-5">
        <h1 className="font-bebas text-white/85 pt-2 mb-2" style={{ fontSize: '6vw', letterSpacing: '0.1em' }}>
          Achievements
        </h1>
        <div className="text-white/40 text-sm font-sans mb-5">
          {unlocked.length} of {unlocked.length + locked.length} unlocked
        </div>

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
      </div>
    </div>
  );
}
