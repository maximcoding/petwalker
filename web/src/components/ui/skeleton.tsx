/**
 * Pulsing placeholder shapes used while data is loading. Same visual everywhere
 * so the loading state is recognisable.
 *
 * Examples:
 *   <Skeleton className="h-4 w-32" />
 *   <SkeletonCard /> for grids
 */

interface BaseProps {
  className?: string;
}

export function Skeleton({ className = '' }: BaseProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}

/** Pet/provider/booking card-shaped skeleton. */
export function SkeletonCard(): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <Skeleton className="mb-3 h-40 w-full" />
      <Skeleton className="mb-2 h-4 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

/** Grid of skeleton cards — drop in while the real list loads. */
export function SkeletonGrid({ count = 6 }: { count?: number }): JSX.Element {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <SkeletonCard />
        </li>
      ))}
    </ul>
  );
}

/** Single horizontal row skeleton — for booking cards / list items. */
export function SkeletonRow(): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-2 flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }): JSX.Element {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <SkeletonRow />
        </li>
      ))}
    </ul>
  );
}
