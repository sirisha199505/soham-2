export function Skeleton({ className = '', width, height }) {
  return (
    <div
      className={`skeleton rounded-lg ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton width={40} height={40} className="rounded-xl" />
        <div className="flex-1">
          <Skeleton height={14} className="mb-2 w-3/4" />
          <Skeleton height={12} className="w-1/2" />
        </div>
      </div>
      <Skeleton height={32} className="mb-2 w-1/2" />
      <Skeleton height={12} className="w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 flex gap-4">
        {Array(cols).fill(0).map((_, i) => <Skeleton key={i} height={14} className="flex-1" />)}
      </div>
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="px-4 py-3.5 border-t border-slate-50 flex gap-4">
          {Array(cols).fill(0).map((_, j) => (
            <Skeleton key={j} height={14} className="flex-1" style={{ width: `${50 + j * 10}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={28} className="w-48 mb-2" />
          <Skeleton height={16} className="w-72" />
        </div>
        <Skeleton height={40} className="w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
      <SkeletonTable />
    </div>
  );
}
