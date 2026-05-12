import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { JSX, ReactNode } from 'react';

/**
 * SectionRail — horizontal scrolling rail for home-page sections
 * (Upcoming · Recently booked · Favorites · Suggested). Title row
 * with an optional "View all →" link, then a horizontally-scrolling
 * row of children with snap-stop behaviour for mobile.
 */
export interface SectionRailProps {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  /** Children should be flex-items (cards). The rail wraps them in a
   * snap-scrolling container with consistent spacing. */
  children: ReactNode;
  /** Render a normal grid instead of a horizontal rail (e.g. for the
   * Suggested-near-you section on desktop). */
  asGrid?: boolean;
}

export function SectionRail({
  title,
  viewAllHref,
  viewAllLabel = 'View all',
  children,
  asGrid = false,
}: SectionRailProps): JSX.Element {
  return (
    <section className="py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-ink-primary sm:text-xl">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-ink-link transition-colors hover:text-ink-link-hover"
          >
            {viewAllLabel}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      {asGrid ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex snap-x snap-mandatory gap-4">{children}</div>
        </div>
      )}
    </section>
  );
}
