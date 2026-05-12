'use client';

import { ChevronDown, MapPin, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { ALL_CATEGORIES, CATEGORY_LABELS, type ServiceCategory } from '@/lib/mock/types';

/**
 * HeroSearch — top of the Owner home (and Search results). One row
 * with three primary fields:
 *   • Service select
 *   • Location input
 *   • Date input
 * + a primary Search CTA.
 *
 * Below the row on /home: optional caption explaining the entry
 * ("Find a sitter, walker, vet near you").
 *
 * Mobile: each field stacks full-width with the CTA at the end.
 * Desktop: single horizontal pill-styled bar.
 */
export interface HeroSearchProps {
  initialService?: ServiceCategory;
  initialLocation?: string;
  initialDate?: string;
  /** Compact mode for the search results page — drops the caption. */
  compact?: boolean;
}

export function HeroSearch({
  initialService = 'walking',
  initialLocation = '',
  initialDate = '',
  compact = false,
}: HeroSearchProps): JSX.Element {
  const router = useRouter();
  const [service, setService] = useState<ServiceCategory>(initialService);
  const [location, setLocation] = useState(initialLocation);
  const [date, setDate] = useState(initialDate);

  function submit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const params = new URLSearchParams({ service });
    if (location) params.set('location', location);
    if (date) params.set('date', date);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <section className={compact ? '' : 'py-6 sm:py-10'}>
      {!compact && (
        <header className="mb-6 text-center sm:mb-8">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl lg:text-5xl">
            Find a sitter, walker, or vet
            <br className="hidden sm:inline" />{' '}
            <span className="text-brand-600">near you.</span>
          </h1>
          <p className="mt-3 text-sm text-ink-secondary sm:text-base">
            11 service categories. Verified pros. Real-time tracking.
          </p>
        </header>
      )}
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-raised p-2 shadow-card md:flex-row md:items-center md:gap-0"
      >
        {/* Service */}
        <label className="relative flex flex-1 items-center gap-3 rounded-lg px-3 py-2 hover:bg-warm-50 md:rounded-lg">
          <Search className="h-5 w-5 shrink-0 text-ink-tertiary" aria-hidden />
          <span className="flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
              Service
            </span>
            <select
              value={service}
              onChange={(e) => setService(e.target.value as ServiceCategory)}
              className="w-full appearance-none bg-transparent text-sm font-medium text-ink-primary outline-none"
            >
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden />
        </label>

        <span aria-hidden className="hidden h-8 w-px shrink-0 bg-border-subtle md:block" />

        {/* Location */}
        <label className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2 hover:bg-warm-50">
          <MapPin className="h-5 w-5 shrink-0 text-ink-tertiary" aria-hidden />
          <span className="flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
              Location
            </span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Brooklyn, NY"
              className="w-full bg-transparent text-sm font-medium text-ink-primary outline-none placeholder:text-ink-tertiary"
            />
          </span>
        </label>

        <span aria-hidden className="hidden h-8 w-px shrink-0 bg-border-subtle md:block" />

        {/* Date */}
        <label className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2 hover:bg-warm-50">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-ink-tertiary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <span className="flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
              Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-ink-primary outline-none"
            />
          </span>
        </label>

        <button
          type="submit"
          className="ms-0 mt-2 inline-flex h-12 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-6 text-base font-semibold text-ink-inverse transition-colors hover:bg-brand-700 md:ms-2 md:mt-0"
        >
          <Search className="h-4 w-4" aria-hidden />
          Search
        </button>
      </form>
    </section>
  );
}
