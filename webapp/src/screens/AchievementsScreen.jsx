import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import ScreenBg from '../ScreenBg';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import { CARD_BTN_STYLE } from '../shared';

// One icon per category type
const CATEGORY_ICONS = {
  volume: (
    // Trophy — total weight lifted
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"/>
      <path d="M6 3h12v6a6 6 0 01-12 0V3zM12 15v4M8 22h8M8 19h8"/>
    </svg>
  ),
  workouts: (
    // Star — total workouts completed
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  weekly: (
    // Bolt — workouts per week streak
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  cardio: (
    // Heart — cardio sessions
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  ),
  weekly_streak: (
    // Flame — consecutive weekly streak
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
    </svg>
  ),
};

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
  const IconComponent = CATEGORY_ICONS[type] || CATEGORY_ICONS.workouts;
  
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
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-5 gap-4">
          <p className="text-white/50 font-bebas tracking-wider text-center">Something went wrong</p>
          <div className="flex gap-3">
            <button onClick={goBack} className="card-press rounded-2xl px-6 py-3 font-bebas tracking-wider" style={CARD_BTN_STYLE}>Back</button>
            <button onClick={() => { setError(null); setLoading(true); api.getAchievements(userId).then(setData).catch(e => { setError(e.message); showToast(e.message); }).finally(() => setLoading(false)); }} className="card-press rounded-2xl px-6 py-3 font-bebas tracking-wider" style={CARD_BTN_STYLE}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const { unlocked, locked } = data;

  return (
    <div className="min-h-screen relative overflow-hidden pb-10">
      <ScreenBg />
      <div className="relative z-10 p-5">
        <button onClick={goBack} className="flex items-center gap-1 mb-3 -ml-0.5">
          <span className="text-white/35 text-base leading-none">‹</span>
          <span className="font-bebas tracking-wider text-white/35 text-sm">Back</span>
        </button>
        <h1 className="font-bebas text-white/85 mb-2" style={{ fontSize: '6vw', letterSpacing: '0.1em' }}>
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
