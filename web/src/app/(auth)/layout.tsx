import { PawPrint } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { PropsWithChildren } from 'react';

import { AppStoreBadge, GooglePlayBadge } from '@/components/auth/store-badges';
import { PhoneShowcase } from '@/components/auth/phone-showcase';

/**
 * Photo paths used by the auth screen.
 *
 * Drop the real cutout file at this path to take over from the
 * placedog.net fallback. Until it exists, the layout still works
 * (it just shows a slightly different photo).
 */
const DACHSHUND_PHOTO = '/images/auth/dachshund-curlers.jpg';

/**
 * AuthLayout — single-screen layout for /sign-in, /confirm and the
 * upcoming edge-case + onboarding flows. **Never scrolls.**
 *
 *   Desktop (lg+):   50 % LEFT brand pane · 50 % RIGHT form pane.
 *                    Brand pane: logo, phone showcase with 4 dog
 *                    orbs around it, "Get the mobile app" badges.
 *                    Form pane: form on white surface, frameless.
 *
 *   Mobile  (<lg):   Single column, form-focused. Gradient backdrop
 *                    with decorative dog photos behind the form, a
 *                    mini-header with logo at top, the form centered
 *                    (no white card frame, white text on the
 *                    gradient), a "Get the mobile app" badge row,
 *                    and Privacy · Terms · Help in the footer.
 *
 * `h-[100dvh] overflow-hidden` on `main` locks the page to the
 * dynamic viewport height on every viewport, so the auth screen
 * never scrolls regardless of browser-chrome state.
 */

/** Decorative dog photos for the mobile background layer. */
const MOBILE_DOGS = [
  { src: 'https://placedog.net/240/240?id=58', cls: '-start-10 top-24 h-28 w-28 rounded-full', rot: -8 },
  { src: 'https://placedog.net/240/240?id=12', cls: '-end-8 top-36 h-24 w-24 rounded-3xl', rot: 8 },
  { src: 'https://placedog.net/240/240?id=33', cls: '-start-12 bottom-44 h-32 w-32 rounded-full', rot: -4 },
  { src: 'https://placedog.net/240/240?id=77', cls: '-end-12 bottom-56 h-28 w-28 rounded-3xl', rot: 6 },
] as const;

export default function AuthLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-gradient-sunset lg:flex-row lg:bg-surface-base">
      {/* ─── DESKTOP-ONLY: dachshund peeking at the seam ─── */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 z-elevated hidden lg:block"
        style={{ transform: 'translate(-60%, 0) rotate(-4deg)' }}
      >
        <Image
          src={DACHSHUND_PHOTO}
          alt=""
          width={1100}
          height={1100}
          style={{ width: 1100, height: 'auto' }}
          priority
          unoptimized
        />
      </div>

      {/* ─── MOBILE-ONLY: decorative dog photos on the background ───
          Sits at z-base — behind the form (z-sticky) — and is
          pushed to the edges so it frames the form without
          clashing with the white-on-gradient form text. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-base lg:hidden">
        {MOBILE_DOGS.map((d) => (
          <div
            key={d.src}
            className={`absolute overflow-hidden shadow-overlay ring-4 ring-ink-inverse ${d.cls}`}
            style={{ transform: `rotate(${d.rot}deg)` }}
          >
            <Image
              src={d.src}
              alt=""
              width={180}
              height={180}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* ─── DESKTOP brand pane (hidden on mobile) ─── */}
      <aside className="relative hidden h-screen overflow-hidden bg-gradient-sunset lg:flex lg:w-1/2 lg:flex-col xl:w-[55%]">
        {/* Decorative blur orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -end-32 h-96 w-96 rounded-full bg-gradient-meadow opacity-50 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -start-40 h-[28rem] w-[28rem] rounded-full bg-gradient-sky opacity-50 blur-3xl"
        />

        {/* Top — big wordmark hero. Per Maxim 2026-05-12: the
            wordmark should look like the brand poster — huge,
            extrabold, tight-tracked, all-lowercase white type on
            the gradient. No paw icon at this size. */}
        <div className="relative z-elevated shrink-0 px-8 pb-2 pt-10 lg:px-12">
          <Link
            href="/"
            className="block text-6xl font-extrabold leading-none tracking-tight text-ink-inverse xl:text-7xl"
          >
            petwalker
          </Link>
        </div>

        {/* Middle — phone showcase only. The hero copy ("Pet care, a
            tap away." + descriptor) was moved to `/` (the marketing
            landing) so the auth screen stays purpose-focused. */}
        <div className="relative z-sticky flex min-h-0 flex-1 flex-col items-center justify-center px-8 lg:px-12 xl:px-20">
          <PhoneShowcase />
        </div>

        {/* Bottom — store badges */}
        <div className="relative z-elevated shrink-0 px-8 pb-6 lg:px-12 lg:pb-8">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-ink-inverse/80">
            Get the mobile app
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="https://apps.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download on the App Store"
            >
              <AppStoreBadge />
            </Link>
            <Link
              href="https://play.google.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get it on Google Play"
            >
              <GooglePlayBadge />
            </Link>
          </div>
        </div>
      </aside>

      {/* ─── FORM pane (always visible). Frameless on mobile (sits
          on gradient with white text), white card on desktop. ─── */}
      <section className="relative flex min-h-0 flex-1 flex-col lg:z-elevated lg:bg-surface-raised">
        {/* Mobile-only mini-top with just the logo. `px-6` only — no
            `mx-auto max-w-md` because that combo drifts the logo
            rightward as the viewport widens past 448px. With plain
            `px-6` the logo is anchored to a fixed 24px offset at
            every mobile width — no drift on resize. */}
        <header className="shrink-0 lg:hidden">
          <div className="flex h-16 w-full items-center justify-start px-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-ink-inverse"
            >
              <PawPrint className="h-6 w-6" aria-hidden />
              petwalker
            </Link>
          </div>
        </header>

        {/* Form area. Mobile: centered frameless form with white text
            on the gradient. Desktop: white form pane with dark text.
            Descendant-variant classes (`[&_h1]` / `[&_p]`) override
            AuthCard's hardcoded text colors per breakpoint without
            changing the AuthCard API. */}
        <div className="relative flex flex-1 items-center justify-center px-4 py-4 sm:px-6 lg:px-12 lg:py-10">
          {/* Gray-dog backdrop behind the Welcome form, 50% opacity.
              z-base keeps it under the form (z-sticky). Aligned to
              the TOP of the form area so the dog's muzzle peeks out
              above the form content instead of being covered by it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-base flex items-start justify-center pt-2"
          >
            <Image
              src="/images/auth/gray-dog.jpg"
              alt=""
              width={1000}
              height={500}
              className="max-w-none shrink-0 opacity-20"
              style={{ width: 1000, height: 'auto' }}
              unoptimized
            />
          </div>
          <div
            className={[
              'relative z-sticky w-full max-w-md',
              // Mobile: frameless, white text on gradient
              'p-2',
              '[&_h1]:text-ink-inverse [&_h1]:drop-shadow-sm',
              '[&_p]:text-ink-inverse/85',
              // Desktop: white card, dark text, restored padding
              'lg:rounded-2xl lg:bg-surface-raised lg:p-8 lg:shadow-none',
              'lg:[&_h1]:text-ink-primary lg:[&_h1]:drop-shadow-none',
              'lg:[&_p]:text-ink-secondary',
            ].join(' ')}
          >
            {children}

            {/* Mobile-only "Get the mobile app" badge row — rendered
                inside the centered form group so it sits right
                under the form instead of being pushed down to the
                footer. On desktop the badges live in the brand
                pane, so this is `lg:hidden`. */}
            <div className="mt-40 lg:hidden">
              <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-ink-inverse/80">
                Get the mobile app
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="https://apps.apple.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download on the App Store"
                >
                  <AppStoreBadge />
                </Link>
                <Link
                  href="https://play.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Get it on Google Play"
                >
                  <GooglePlayBadge />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer (Privacy · Terms · Help) — visible on both
            viewports. Copyright is NOT here — it lives in the `/`
            footer (marketing surface). Keeping auth footer minimal
            keeps the surface focused on the form. */}
        <footer className="relative z-sticky px-6 pb-6 lg:px-12">
          <div className="mx-auto flex w-full max-w-md items-center justify-center gap-4 text-xs text-ink-inverse/85 lg:text-ink-tertiary">
            <Link href="/privacy" className="hover:text-ink-inverse lg:hover:text-ink-primary">
              Privacy
            </Link>
            <span aria-hidden>·</span>
            <Link href="/terms" className="hover:text-ink-inverse lg:hover:text-ink-primary">
              Terms
            </Link>
            <span aria-hidden>·</span>
            <Link href="/contact" className="hover:text-ink-inverse lg:hover:text-ink-primary">
              Help
            </Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
