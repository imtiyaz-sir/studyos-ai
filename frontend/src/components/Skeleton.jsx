import { cx } from "../lib/utils";

function Shimmer({ className }) {
  return <div className={cx("animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.08]", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-5">
        <Shimmer className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-3.5 w-2/3" />
          <Shimmer className="h-2.5 w-1/3" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Shimmer className="h-2.5 w-16" />
          <Shimmer className="h-2.5 w-14" />
        </div>
        <Shimmer className="w-12 h-12 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Shimmer className="w-9 h-9 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-3 w-1/2" />
        <Shimmer className="h-2.5 w-1/4" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="card divide-y divide-black/5 dark:divide-white/5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 lg:p-5">
          <Shimmer className="w-9 h-9 rounded-xl mb-3" />
          <Shimmer className="h-6 w-14 mb-1.5" />
          <Shimmer className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}
