'use client';

import { Heart, MapPin, MessageCircle, Search } from 'lucide-react';
import Link from 'next/link';

import {
  BottomTabBar,
  Cluster,
  Container,
  Footer,
  Header,
  MobileTopBar,
  Stack,
} from '@/components/layout';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { MapPlaceholder } from '@/components/ui/map-placeholder';
import { Pill } from '@/components/ui/pill';
import { Tag } from '@/components/ui/tag';

/**
 * /design — live design system reference for PR #1 / M1 Foundation.
 *
 * Public route (outside the (app) auth group). Renders every token,
 * primitive, and layout building block in the actual Next.js app so
 * Maxim can verify the system in his browser without signing in.
 *
 * This is NOT a product screen — it's a design QA surface. The
 * authoritative spec lives in
 * `.claude/skills/dogwalk-design/SKILL.md`.
 */

const HUE_FAMILIES = [
  'brand',
  'coral',
  'sunshine',
  'mint',
  'sky',
  'lavender',
  'peach',
  'warm',
] as const;

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

function PaletteRow({ name }: { name: (typeof HUE_FAMILIES)[number] }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0 text-xs font-semibold text-ink-secondary">{name}</div>
      <div className="grid flex-1 grid-cols-10 gap-1">
        {STEPS.map((step) => (
          <div
            key={step}
            className="h-8 rounded-md"
            style={{ background: `var(--color-${name}-${step})` }}
            title={`${name}-${step}`}
          />
        ))}
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-tertiary">
        {title}
      </h2>
      <div className="rounded-2xl border border-border-subtle bg-surface-raised p-5">
        {children}
      </div>
    </section>
  );
}

export default function DesignSystemPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-surface-base">
      {/* Hero */}
      <div className="bg-gradient-meadow">
        <Container>
          <div className="flex flex-col gap-3 py-12 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-ink-inverse/80">
                PR #1 · feature/m1-foundation
              </div>
              <h1 className="mt-1 text-4xl font-bold tracking-tight text-ink-inverse sm:text-5xl">
                dogwalk design system
              </h1>
              <p className="mt-2 max-w-xl text-sm text-ink-inverse/90">
                Colorful pets · Light mode only · Plus Jakarta Sans · 7 hue families ×
                10 steps · warm-tinted neutrals. Every value below is a CSS variable
                in <code className="rounded bg-black/15 px-1 py-0.5 font-mono text-xs text-ink-inverse">globals.css</code>.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-surface-raised px-5 text-sm font-semibold text-ink-primary transition-colors hover:bg-warm-50"
            >
              ← Back to app
            </Link>
          </div>
        </Container>
      </div>

      <Container>
        {/* Sticky in-page nav */}
        <nav
          aria-label="Design system sections"
          className="sticky top-0 z-sticky -mx-4 mb-6 mt-8 flex overflow-x-auto bg-surface-base/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0"
        >
          <ul className="flex gap-1 whitespace-nowrap">
            {[
              ['palette', 'Palette'],
              ['typography', 'Typography'],
              ['pills', 'Status pills'],
              ['chips', 'Category chips'],
              ['identity', 'Identity'],
              ['gradients', 'Gradients'],
              ['empty', 'Empty + Map'],
              ['shell', 'App Shell'],
            ].map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-ink-secondary transition-colors hover:bg-warm-100 hover:text-ink-primary"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Stack gap="xl" className="pb-16">
          {/* Palette */}
          <Section id="palette" title="1 · Multi-hue palette (50 → 900)">
            <Stack gap="md">
              {HUE_FAMILIES.map((h) => (
                <PaletteRow key={h} name={h} />
              ))}
              <div className="flex items-center gap-3 pt-2">
                <div className="w-20 shrink-0" />
                <div className="grid flex-1 grid-cols-10 gap-1">
                  {STEPS.map((s) => (
                    <div
                      key={s}
                      className="text-center text-[10px] font-medium text-ink-tertiary"
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </Stack>
          </Section>

          {/* Typography */}
          <Section id="typography" title="2 · Typography · Plus Jakarta Sans">
            <Stack gap="md">
              <div>
                <div className="text-xs font-medium text-ink-tertiary">Display · 800</div>
                <div className="mt-1 text-5xl font-extrabold tracking-tight">
                  Walk happy
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-ink-tertiary">Heading 1 · 700</div>
                <div className="mt-1 text-3xl font-bold tracking-tight">
                  Find a sitter near you
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-ink-tertiary">Heading 2 · 600</div>
                <div className="mt-1 text-xl font-semibold">
                  Upcoming bookings
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-ink-tertiary">Body · 400</div>
                <p className="mt-1 max-w-prose text-base leading-relaxed text-ink-secondary">
                  Loose-leash specialists, weekly check-ins, photo reports. Find someone
                  near you in minutes, book in seconds, and watch the walk live.
                </p>
              </div>
              <div>
                <div className="text-xs font-medium text-ink-tertiary">Caption · 500</div>
                <div className="mt-1 text-xs font-medium text-ink-tertiary">
                  Tap any provider to see their full profile
                </div>
              </div>
            </Stack>
          </Section>

          {/* Booking status pills */}
          <Section id="pills" title="3 · Booking status pills">
            <Cluster gap="sm">
              <Pill hue="sunshine">Pending</Pill>
              <Pill hue="sky">Confirmed</Pill>
              <Pill hue="mint">In progress</Pill>
              <Pill hue="warm">Completed</Pill>
              <Pill hue="coral">Cancelled</Pill>
              <Pill hue="lavender">In dispute</Pill>
            </Cluster>
            <div className="mt-4 border-t border-border-subtle pt-4">
              <div className="mb-2 text-xs font-medium text-ink-tertiary">Solid variant</div>
              <Cluster gap="sm">
                <Pill hue="sunshine" tone="solid">Pending</Pill>
                <Pill hue="sky" tone="solid">Confirmed</Pill>
                <Pill hue="mint" tone="solid">In progress</Pill>
                <Pill hue="warm" tone="solid">Completed</Pill>
                <Pill hue="coral" tone="solid">Cancelled</Pill>
                <Pill hue="lavender" tone="solid">In dispute</Pill>
              </Cluster>
            </div>
          </Section>

          {/* Service category chips */}
          <Section id="chips" title="4 · Service category chips (Tag)">
            <Cluster gap="sm">
              <Tag hue="brand" selected>Walking</Tag>
              <Tag hue="coral">Sitting</Tag>
              <Tag hue="lavender">Grooming</Tag>
              <Tag hue="mint">Boarding</Tag>
              <Tag hue="sunshine">Training</Tag>
              <Tag hue="peach">Daycare</Tag>
              <Tag hue="sky">Fitness</Tag>
              <Tag hue="mint">Vet visits</Tag>
              <Tag hue="coral">Photography</Tag>
              <Tag hue="lavender">Massage</Tag>
              <Tag hue="peach">Senior care</Tag>
            </Cluster>
            <div className="mt-4 border-t border-border-subtle pt-4">
              <div className="mb-2 text-xs font-medium text-ink-tertiary">Removable</div>
              <Cluster gap="sm">
                <Tag hue="brand" selected removable onRemove={() => undefined}>Walking</Tag>
                <Tag hue="coral" selected removable onRemove={() => undefined}>Sitting</Tag>
              </Cluster>
            </div>
          </Section>

          {/* Identity primitives */}
          <Section id="identity" title="5 · Identity · Avatar, Badge, buttons">
            <Stack gap="lg">
              <Cluster gap="lg" align="center">
                <Avatar alt="Maxim" size="xs" />
                <Avatar alt="Marcus Reed" size="sm" online />
                <Avatar alt="Jamie Groomer" size="md" />
                <Avatar alt="Sara Khan" size="lg" online />
                <Avatar alt="Test User" size="xl" />
              </Cluster>
              <div className="border-t border-border-subtle pt-4">
                <div className="mb-3 text-xs font-medium text-ink-tertiary">Badge counts</div>
                <Cluster gap="lg" align="center">
                  <div className="relative inline-flex">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-warm-100 text-ink-primary"
                      aria-label="Notifications"
                    >
                      <MessageCircle className="h-5 w-5" aria-hidden />
                    </button>
                    <span className="absolute -end-1 -top-1">
                      <Badge count={3} />
                    </span>
                  </div>
                  <div className="relative inline-flex">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-warm-100 text-ink-primary"
                      aria-label="Search"
                    >
                      <Search className="h-5 w-5" aria-hidden />
                    </button>
                    <span className="absolute -end-1 -top-1">
                      <Badge count={120} hue="brand" />
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
                    <Badge variant="dot" />
                    <span>Unread</span>
                  </div>
                </Cluster>
              </div>
              <div className="border-t border-border-subtle pt-4">
                <div className="mb-3 text-xs font-medium text-ink-tertiary">Primary actions</div>
                <Cluster gap="sm" align="center">
                  <button
                    type="button"
                    className="inline-flex min-h-touch items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-ink-inverse transition-colors hover:bg-brand-700"
                  >
                    Book now
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-touch items-center rounded-lg border border-border-default bg-surface-raised px-5 text-sm font-semibold text-ink-primary transition-colors hover:bg-warm-50"
                  >
                    <Heart className="me-1.5 h-4 w-4" aria-hidden />
                    Favorite
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-touch items-center rounded-lg bg-coral-100 px-5 text-sm font-semibold text-coral-700 transition-colors hover:bg-coral-200"
                  >
                    Cancel booking
                  </button>
                </Cluster>
              </div>
            </Stack>
          </Section>

          {/* Gradients */}
          <Section id="gradients" title="6 · Decorative gradients">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex h-24 items-end rounded-2xl bg-gradient-sunset p-3 text-sm font-semibold text-ink-inverse">
                sunset
              </div>
              <div className="flex h-24 items-end rounded-2xl bg-gradient-meadow p-3 text-sm font-semibold text-ink-inverse">
                meadow
              </div>
              <div className="flex h-24 items-end rounded-2xl bg-gradient-sky p-3 text-sm font-semibold text-ink-inverse">
                sky
              </div>
              <div className="flex h-24 items-end rounded-2xl bg-gradient-warm p-3 text-sm font-semibold text-ink-inverse">
                warm
              </div>
            </div>
          </Section>

          {/* Empty + Map */}
          <Section id="empty" title="7 · EmptyState + MapPlaceholder">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium text-ink-tertiary">EmptyState · gradient="sunset"</div>
                <EmptyState
                  gradient="sunset"
                  illustration={<Heart className="h-12 w-12 text-ink-inverse" aria-hidden />}
                  headline="No favorites yet"
                  subcopy="Tap the heart on any provider to save them here."
                  primary={{ label: 'Find a provider', onClick: () => undefined }}
                />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-ink-tertiary">MapPlaceholder</div>
                <MapPlaceholder
                  center={{ lat: 40.7, lng: -73.95 }}
                  radiusKm={6}
                  pins={[
                    { id: '1', lat: 40.7, lng: -73.95 },
                    { id: '2', lat: 40.71, lng: -73.94 },
                    { id: '3', lat: 40.72, lng: -73.96 },
                  ]}
                />
                <p className="mt-2 text-xs text-ink-tertiary">
                  Stub component until the M-Maps phase picks Mapbox vs Google.
                </p>
              </div>
            </div>
          </Section>

          {/* App Shell — live previews */}
          <Section id="shell" title="8 · App Shell live previews">
            <Stack gap="lg">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-tertiary">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  Desktop ≥ 768px · sticky Header + Footer
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-base">
                  <div className="text-ink-primary [&_header]:relative [&_header]:top-auto">
                    <PreviewHeader />
                  </div>
                  <div className="p-6 text-center text-xs text-ink-tertiary">
                    ← body scrolls here →
                  </div>
                  <PreviewFooter />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-tertiary">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  Mobile &lt; 768px · MobileTopBar + BottomTabBar
                </div>
                <div className="mx-auto w-[260px] overflow-hidden rounded-3xl border border-border-default bg-surface-base">
                  <div className="text-ink-primary [&_header]:relative [&_header]:top-auto">
                    <PreviewMobileTop />
                  </div>
                  <div className="p-4 text-center text-xs text-ink-tertiary">
                    ← body →
                  </div>
                  <div className="[&_nav]:relative [&_nav]:bottom-auto">
                    <PreviewBottomTabs />
                  </div>
                </div>
                <p className="mt-2 text-center text-xs text-ink-tertiary">
                  Resize this window below 768px to see the real shell switch live.
                </p>
              </div>
            </Stack>
          </Section>

          <div className="text-center text-xs text-ink-tertiary">
            All values trace to{' '}
            <code className="rounded bg-warm-100 px-1 py-0.5 font-mono">
              web/src/app/globals.css
            </code>
            {' + '}
            <code className="rounded bg-warm-100 px-1 py-0.5 font-mono">
              web/tailwind.config.ts
            </code>
            .
          </div>
        </Stack>
      </Container>
    </main>
  );
}

/* ------------------------------------------------------------------
 * Static mini-previews — these intentionally bypass the ViewMode
 * context (which requires a real User) and just render the chrome
 * markup with hard-coded labels so the page works without sign-in.
 * ------------------------------------------------------------------ */

function PreviewHeader(): JSX.Element {
  return (
    <header className="border-b border-border-subtle bg-surface-raised">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold">petwalker</span>
            <ul className="flex items-center gap-1">
              {['Pets', 'Find a provider', 'My bookings', 'Favorites', 'Messages'].map(
                (l, i) => (
                  <li key={l}>
                    <span
                      className={
                        'inline-flex h-10 items-center rounded-md px-3 text-sm font-medium ' +
                        (i === 1
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-ink-secondary')
                      }
                    >
                      {l}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-warm-100">
              <MessageCircle className="h-5 w-5" aria-hidden />
              <span className="absolute -end-1 -top-1">
                <Badge count={2} />
              </span>
            </span>
            <Avatar alt="ML" size="sm" />
          </div>
        </div>
      </Container>
    </header>
  );
}

function PreviewMobileTop(): JSX.Element {
  return (
    <header className="border-b border-border-subtle bg-surface-raised">
      <div className="flex h-14 items-center justify-between px-4">
        <span className="text-base font-bold">petwalker</span>
        <div className="flex items-center gap-1">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-warm-100">
            <MessageCircle className="h-4 w-4" aria-hidden />
            <span className="absolute -end-1 -top-1">
              <Badge count={2} />
            </span>
          </span>
          <Avatar alt="ML" size="sm" />
        </div>
      </div>
    </header>
  );
}

function PreviewBottomTabs(): JSX.Element {
  const items = [
    { i18nKey: 'Pets', Icon: Heart },
    { i18nKey: 'Find', Icon: Search },
    { i18nKey: 'Bookings', Icon: MapPin },
    { i18nKey: 'Saved', Icon: Heart },
    { i18nKey: 'Chat', Icon: MessageCircle },
  ];
  return (
    <nav className="border-t border-border-subtle bg-surface-raised">
      <ul className="grid grid-cols-5">
        {items.map(({ i18nKey, Icon }, i) => (
          <li key={i18nKey}>
            <div
              className={
                'flex min-h-touch flex-col items-center justify-center gap-0.5 py-2 ' +
                (i === 1 ? 'text-brand-600' : 'text-ink-tertiary')
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-[10px] font-medium">{i18nKey}</span>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PreviewFooter(): JSX.Element {
  return (
    <footer className="border-t border-border-subtle bg-surface-raised">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-ink-tertiary">
          <span>© 2026 PetWalker</span>
          <span>About · Privacy · Terms · Contact</span>
          <span>EN · USD</span>
        </div>
      </Container>
    </footer>
  );
}

/* Suppress dead-import warnings from layout primitives we re-render
 * via the preview helpers above. They're imported up top so a future
 * version of this page can drop the preview shims and use the real
 * App Shell wrappers once ViewModeProvider is mockable. */
void [Header, Footer, MobileTopBar, BottomTabBar];
