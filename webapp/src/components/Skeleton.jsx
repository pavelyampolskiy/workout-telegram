export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`skeleton-pulse rounded-lg bg-white/10 ${className}`}
      style={style}
    />
  );
}

export function SkeletonCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
      }}
    >
      {children}
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <SkeletonCard key={i}>
          <Skeleton className="h-4 w-20 mb-2" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonCard className="p-5">
        <div className="flex justify-center">
          <Skeleton className="h-12 w-16" />
        </div>
        <Skeleton className="h-3 w-20 mx-auto mt-2" />
      </SkeletonCard>
      <SkeletonCard className="p-5">
        <Skeleton className="h-3 w-16 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="flex justify-between mb-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-6" />
              </div>
              <Skeleton className="h-2.5 w-full" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

export function HomeStatsSkeleton() {
  return (
    <div className="flex items-center gap-4 text-xs mt-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Progress screen: selector card + content cards */
export function ProgressSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <Skeleton className="h-3 w-24 mb-3" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Workout screen: day cards + cardio */
export function WorkoutSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <SkeletonCard key={i} className="p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </SkeletonCard>
      ))}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-[9px] uppercase tracking-widest text-white/25 font-sans">or</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>
      <SkeletonCard className="p-4 flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <Skeleton className="h-4 w-20" />
      </SkeletonCard>
    </div>
  );
}

/** Program screen: title, subtitle, day cards */
export function ProgramSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20 mb-1" />
      <Skeleton className="h-3 w-full mb-5" />
      {[1, 2, 3, 4].map(i => (
        <SkeletonCard key={i} className="p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

/** Program day screen: title, subtitle, exercise rows, Add button */
export function ProgramDaySkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-full mb-5" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.025)' }}>
          <div className="flex flex-col gap-1 shrink-0">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
      <Skeleton className="h-14 w-full rounded-xl mt-4" />
    </div>
  );
}

/** Exercise screen: back, title, progress bar, set rows */
export function ExerciseSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div>
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center justify-between py-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** History detail: date, title, exercise cards */
export function HistoryDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-3 w-24 mb-1" />
        <Skeleton className="h-8 w-32" />
      </div>
      {[1, 2, 3].map(i => (
        <SkeletonCard key={i} className="p-4">
          <Skeleton className="h-4 w-28 mb-2" />
          <Skeleton className="h-3 w-20 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

/** Day screen: header, exercise list rows */
export function DaySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <SkeletonCard key={i} className="p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

/** Cardio screen: content area + bottom CTA */
export function CardioSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-4 w-48 max-w-full" />
      <Skeleton className="h-14 w-full rounded-2xl mt-8" />
    </div>
  );
}

/** Progress screen: content block only (chart + sessions list) — used when loading program data */
export function ProgressContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-white/[0.04] rounded-2xl p-4 flex items-center gap-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <Skeleton className="h-3 w-40 mb-3" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <Skeleton className="h-3 w-24 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Achievements screen: list of achievement cards */
export function AchievementsSkeleton() {
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

// Add CSS for custom skeleton animation (white/gray instead of green)
const skeletonStyle = document.createElement('style');
skeletonStyle.textContent = `
  @keyframes skeleton-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
  
  .skeleton-pulse {
    animation: skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;
if (!document.head.querySelector('style[data-skeleton]')) {
  skeletonStyle.setAttribute('data-skeleton', 'true');
  document.head.appendChild(skeletonStyle);
}
