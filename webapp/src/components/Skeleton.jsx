export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/10 ${className}`}
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
        border: '1px solid rgba(255, 255, 255, 0.05)',
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
