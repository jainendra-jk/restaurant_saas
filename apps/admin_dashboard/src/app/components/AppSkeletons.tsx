function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200/70 ${className}`} />;
}

export function AdminShellSkeleton() {
  return (
    <div className="min-h-screen bg-background p-5 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <SkeletonBlock className="h-9 w-56" />
        <SkeletonBlock className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 h-[calc(100vh-120px)]">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <SkeletonBlock key={`nav-${idx}`} className="h-10 w-full" />
          ))}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-5 overflow-hidden">
          <SkeletonBlock className="h-8 w-56" />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`stat-${idx}`} className="rounded-xl border border-gray-100 p-4 space-y-3">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-7 w-16" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SkeletonBlock className="h-72 w-full" />
            <SkeletonBlock className="h-72 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-64" />
        <SkeletonBlock className="h-8 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <SkeletonBlock key={`d-stat-${idx}`} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonBlock className="h-80 w-full" />
        <SkeletonBlock className="h-80 w-full" />
      </div>
    </div>
  );
}

export function AdminAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-14 w-full max-w-md" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <SkeletonBlock key={`a-stat-${idx}`} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonBlock className="h-80 w-full" />
        <SkeletonBlock className="h-80 w-full" />
      </div>
    </div>
  );
}

export function AdminMenuSkeleton() {
  return (
    <div className="flex flex-col h-full -m-5 lg:-m-6">
      <div className="sticky top-0 z-30 bg-background px-5 lg:px-6 pt-5 lg:pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-48" />
          <SkeletonBlock className="h-10 flex-1 max-w-lg" />
          <SkeletonBlock className="h-10 w-24" />
          <SkeletonBlock className="h-10 w-24" />
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-52 flex-shrink-0 bg-background px-5 lg:px-6 pt-10 pb-4 border-r border-gray-100 space-y-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonBlock key={`m-cat-${idx}`} className="h-10 w-full" />
          ))}
        </div>
        <div className="flex-1 p-5 lg:p-6 grid grid-cols-2 xl:grid-cols-3 gap-4 content-start">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonBlock key={`m-item-${idx}`} className="h-48 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminTablesSkeleton() {
  return (
    <div className="space-y-5">
      <SkeletonBlock className="h-14 w-full max-w-md" />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <SkeletonBlock key={`t-item-${idx}`} className="h-44 w-full" />
        ))}
      </div>
    </div>
  );
}
