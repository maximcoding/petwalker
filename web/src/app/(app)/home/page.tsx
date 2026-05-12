'use client';

import { Heart } from 'lucide-react';

import { CategoryGrid } from '@/components/m3/category-grid';
import { HeroSearch } from '@/components/m3/hero-search';
import { ProviderCardV2 } from '@/components/m3/provider-card-v2';
import { SectionRail } from '@/components/m3/section-rail';
import { UpcomingBookingCard } from '@/components/m3/upcoming-booking-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  PROVIDER_BY_ID,
  PROVIDERS,
  recentlyBooked,
  upcomingBookings,
} from '@/lib/mock';

/**
 * /home — Owner home screen.
 *
 * Per the brief:
 *   - Hero search bar (service + location + date)
 *   - Upcoming bookings (next 1–2 confirmed/pending — actionable)
 *   - Recently booked (re-book with one tap)
 *   - Favorites (horizontal carousel)
 *   - Suggested near you (proximity-sorted, mixed categories)
 *   - Browse by category (11 chips)
 *
 * Empty-state version (no upcoming + no bookings) → CTA "Find your
 * first provider".
 */
export default function OwnerHomePage(): JSX.Element {
  const upcoming = upcomingBookings();
  const recent = recentlyBooked();

  const recentProviders = recent
    .map((b) => PROVIDER_BY_ID[b.providerId])
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Proximity-sorted suggestions — take top 6 by distance.
  const suggested = [...PROVIDERS].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 6);

  // Favorites are demo-only in M3 (real store lands with backend).
  const favorites = PROVIDERS.filter((p) => p.rating >= 4.9).slice(0, 4);

  return (
    <div className="py-2">
      <HeroSearch />

      {upcoming.length > 0 ? (
        <SectionRail title="Upcoming" viewAllHref="/bookings">
          {upcoming.slice(0, 2).map((b) => {
            const p = PROVIDER_BY_ID[b.providerId];
            if (!p) return null;
            return <UpcomingBookingCard key={b.id} booking={b} provider={p} />;
          })}
        </SectionRail>
      ) : (
        <SectionRail title="Upcoming">
          <div className="w-full">
            <EmptyState
              gradient="meadow"
              illustration={<Heart className="h-12 w-12 text-ink-inverse" aria-hidden />}
              headline="Nothing booked yet"
              subcopy="Find your first provider above and you'll see your next booking here."
              primary={{ label: 'Find a provider', href: '/search?service=walking' }}
            />
          </div>
        </SectionRail>
      )}

      {recentProviders.length > 0 && (
        <SectionRail title="Recently booked" viewAllHref="/bookings?status=completed">
          {recentProviders.map((p) => (
            <ProviderCardV2 key={p.id} provider={p} inRail />
          ))}
        </SectionRail>
      )}

      <SectionRail title="Favorites" viewAllHref="/favorites">
        {favorites.map((p) => (
          <ProviderCardV2 key={p.id} provider={p} inRail />
        ))}
      </SectionRail>

      <SectionRail title="Suggested near you" asGrid viewAllHref="/search">
        {suggested.map((p) => (
          <ProviderCardV2 key={p.id} provider={p} />
        ))}
      </SectionRail>

      <CategoryGrid />
    </div>
  );
}
