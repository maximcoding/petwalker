import {
  ArrowRight,
  Facebook,
  Heart,
  Instagram,
  MapPin,
  PawPrint,
  Smartphone,
  Twitter,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import type { JSX, PropsWithChildren } from 'react';

import { AppStoreBadge, GooglePlayBadge } from '@/components/auth/store-badges';
import { PhoneShowcase } from '@/components/auth/phone-showcase';

/**
 * `/` — public marketing landing page.
 *
 * This is the only public surface that converts anonymous visitors.
 * It serves two audiences with one page:
 *  • Pet owners (primary, ~95% of traffic) — sign in or get started.
 *  • Pet walkers (secondary) — a dedicated "Become a walker" panel
 *    routes them to /walker/apply.
 *
 * No fake stats, no fake testimonials. The page makes only claims it
 * can back up. See `docs/landing-page-spec.md` for the full spec.
 *
 * Once a visitor authenticates, the (app) layout takes over and they
 * never return here.
 */

// TODO: replace these with real social URLs once accounts exist.
const SOCIAL_FACEBOOK = 'https://facebook.com/petwalker';
const SOCIAL_INSTAGRAM = 'https://instagram.com/petwalker';
const SOCIAL_TWITTER = 'https://twitter.com/petwalker';
const SOCIAL_TIKTOK = 'https://tiktok.com/@petwalker';

/**
 * `/` — guest-facing entry point.
 *
 * This is NOT the full marketing site (per docs/roadmap.md line 664,
 * marketing landing pages live in a separate marketing surface).
 * It's a stylistic minimum so the dev-mode root URL doesn't look
 * like a leftover scaffold while the real marketing site is built.
 *
 * Once a user signs in, the (app) layout takes over and routes to
 * `/providers` (owner) or `/feed` (provider) per view-mode.
 */
export default function LandingPage(): JSX.Element {
  return (
    <div className="relative flex min-h-screen flex-col bg-surface-base">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <BecomeAWalker />
        <GetTheApp />
      </main>
      <SiteFooter />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sticky header
// ──────────────────────────────────────────────────────────────────

function SiteHeader(): JSX.Element {
  return (
    <header className="sticky top-0 z-sticky border-b border-border-subtle bg-surface-base/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-ink-primary"
        >
          <PawPrint className="h-6 w-6 text-brand-600" aria-hidden />
          petwalker
        </Link>

        <nav aria-label="Account" className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-ink-secondary transition-colors hover:bg-warm-100 hover:text-ink-primary"
          >
            Sign in
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-ink-inverse transition-colors hover:bg-brand-700"
          >
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ──────────────────────────────────────────────────────────────────
// Hero — 2-color tagline + descriptor + CTAs + phone showcase
// ──────────────────────────────────────────────────────────────────

function Hero(): JSX.Element {
  return (
    <section className="relative overflow-hidden bg-gradient-sunset">
      {/* Decorative blur orbs for atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -end-32 -top-32 h-96 w-96 rounded-full bg-gradient-meadow opacity-50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -start-40 h-[28rem] w-[28rem] rounded-full bg-gradient-sky opacity-50 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
        {/* Left — copy + CTAs */}
        <div className="text-center lg:text-start">
          <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-ink-primary">Pet care,</span>{' '}
            <span className="text-brand-600">a tap away.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-ink-secondary sm:text-lg lg:mx-0">
            Walking, sitting, grooming, vet visits, and more. Find a trusted local pro,
            book in seconds, and watch every walk live.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href="/sign-in"
              className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-base font-semibold text-ink-inverse transition-colors hover:bg-brand-700 sm:w-auto"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex min-h-touch w-full items-center justify-center rounded-lg border border-border-default bg-surface-raised px-6 text-base font-semibold text-ink-primary transition-colors hover:bg-warm-50 sm:w-auto"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-6 text-xs text-ink-tertiary">
            By continuing you agree to our{' '}
            <Link href="/terms" className="text-ink-link hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-ink-link hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Right — phone showcase backdrop. Hidden on small screens
            where the hero is already content-heavy; landing on lg+
            it adds the brand pop. */}
        <div className="hidden lg:flex lg:justify-center">
          <PhoneShowcase />
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// How it works — 4 steps
// ──────────────────────────────────────────────────────────────────

function HowItWorks(): JSX.Element {
  return (
    <section className="bg-surface-base py-20 sm:py-24" id="how-it-works">
      <div className="mx-auto w-full max-w-5xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-ink-primary sm:text-4xl">
            How petwalker works
          </h2>
          <p className="mt-3 text-base text-ink-secondary">
            Easily find and book trusted pet pros near you.
          </p>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          <Step
            num={1}
            icon={<PawPrint className="h-6 w-6" aria-hidden />}
            tone="brand"
            title="Pick a service"
          >
            Walks, drop-ins, sitting, boarding, grooming, vet visits — choose what your
            pet needs.
          </Step>
          <Step
            num={2}
            icon={<UserCheck className="h-6 w-6" aria-hidden />}
            tone="mint"
            title="Choose your pro"
          >
            Browse profiles, ratings, and reviews. Chat with a few to find the right
            match.
          </Step>
          <Step
            num={3}
            icon={<Smartphone className="h-6 w-6" aria-hidden />}
            tone="sky"
            title="Follow live"
          >
            Track the walk on a map, get photo updates, and message your pro in real
            time.
          </Step>
          <Step
            num={4}
            icon={<Heart className="h-6 w-6" aria-hidden />}
            tone="coral"
            title="Rate &amp; review"
          >
            Leave a review to help other pet parents find their perfect pro.
          </Step>
        </ol>
      </div>
    </section>
  );
}

const STEP_TONES: Record<'brand' | 'mint' | 'sky' | 'coral', string> = {
  brand: 'bg-brand-100 text-brand-700',
  mint: 'bg-mint-100 text-mint-700',
  sky: 'bg-sky-100 text-sky-700',
  coral: 'bg-coral-100 text-coral-700',
};

function Step({
  num,
  icon,
  tone,
  title,
  children,
}: PropsWithChildren<{
  num: number;
  icon: JSX.Element;
  tone: keyof typeof STEP_TONES;
  title: string;
}>): JSX.Element {
  return (
    <li className="flex flex-col items-center text-center">
      <div className="relative">
        <span
          aria-hidden
          className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${STEP_TONES[tone]}`}
        >
          {icon}
        </span>
        <span
          aria-hidden
          className="absolute -end-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink-primary text-xs font-bold text-ink-inverse"
        >
          {num}
        </span>
      </div>
      <h3 className="mt-5 text-base font-bold text-ink-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{children}</p>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────
// Become a walker — audience pivot panel
// ──────────────────────────────────────────────────────────────────

function BecomeAWalker(): JSX.Element {
  return (
    <section className="relative overflow-hidden bg-gradient-meadow py-20 sm:py-24">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div className="text-center text-ink-inverse lg:text-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-inverse/85">
            For pet pros
          </p>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Earn doing what you love.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base text-ink-inverse/90 lg:mx-0">
            Set your own rates and schedule. Walk dogs, host stays, or offer grooming —
            petwalker brings clients to you.
          </p>

          <ul className="mx-auto mt-6 grid max-w-md gap-3 text-sm text-ink-inverse/90 lg:mx-0">
            <FeatureBullet icon={<MapPin className="h-4 w-4" aria-hidden />}>
              Work in your own neighborhood
            </FeatureBullet>
            <FeatureBullet icon={<Smartphone className="h-4 w-4" aria-hidden />}>
              Manage bookings entirely from your phone
            </FeatureBullet>
            <FeatureBullet icon={<Heart className="h-4 w-4" aria-hidden />}>
              Build a reputation through real reviews
            </FeatureBullet>
          </ul>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <Link
              href="/walker/apply"
              className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-lg bg-ink-primary px-6 text-base font-semibold text-ink-inverse transition-colors hover:bg-warm-900 sm:w-auto"
            >
              Apply to walk
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Walker portrait — placedog fallback until a real cutout
            lives at /images/landing/walker-portrait.jpg. Decorative
            ring + soft shadow gives it the same photo-orb treatment
            used elsewhere. */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative h-72 w-72 overflow-hidden rounded-3xl shadow-overlay ring-4 ring-ink-inverse/90 sm:h-80 sm:w-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://placedog.net/400/400?id=24"
              alt="A pet pro walking a happy golden retriever in a park."
              width={320}
              height={320}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureBullet({
  icon,
  children,
}: PropsWithChildren<{ icon: JSX.Element }>): JSX.Element {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-inverse/20"
      >
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────
// Get the mobile app — App Store + Google Play
// ──────────────────────────────────────────────────────────────────

function GetTheApp(): JSX.Element {
  return (
    <section className="bg-surface-base py-20 sm:py-24">
      <div className="mx-auto w-full max-w-3xl px-6 text-center lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
          Get the mobile app
        </p>
        <h2 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-ink-primary sm:text-4xl">
          Take petwalker anywhere.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base text-ink-secondary">
          Book on the go, message your pro, and follow walks live from your pocket.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download petwalker on the App Store"
          >
            <AppStoreBadge />
          </Link>
          <Link
            href="https://play.google.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get petwalker on Google Play"
          >
            <GooglePlayBadge />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Footer — dark surface, legal links, social row
// ──────────────────────────────────────────────────────────────────

function SiteFooter(): JSX.Element {
  return (
    <footer className="bg-warm-900 text-ink-inverse">
      <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Left: brand */}
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            <PawPrint className="h-5 w-5 text-brand-300" aria-hidden />
            petwalker
          </Link>

          {/* Center: legal links */}
          <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-inverse/80">
            <Link href="/privacy" className="hover:text-ink-inverse">Privacy</Link>
            <Link href="/terms" className="hover:text-ink-inverse">Terms</Link>
            <Link href="/contact" className="hover:text-ink-inverse">Help</Link>
            <Link href="/accessibility" className="hover:text-ink-inverse">Accessibility</Link>
            <Link href="/about" className="hover:text-ink-inverse">About</Link>
          </nav>

          {/* Right: social */}
          <nav aria-label="petwalker on social media" className="flex items-center gap-3">
            <SocialIconLink href={SOCIAL_FACEBOOK} label="petwalker on Facebook">
              <Facebook className="h-5 w-5" aria-hidden />
            </SocialIconLink>
            <SocialIconLink href={SOCIAL_INSTAGRAM} label="petwalker on Instagram">
              <Instagram className="h-5 w-5" aria-hidden />
            </SocialIconLink>
            <SocialIconLink href={SOCIAL_TWITTER} label="petwalker on X">
              <Twitter className="h-5 w-5" aria-hidden />
            </SocialIconLink>
            <SocialIconLink href={SOCIAL_TIKTOK} label="petwalker on TikTok">
              {/* Lucide has no TikTok glyph; tiny inline SVG keeps the
                  row consistent without pulling in a new icon lib. */}
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M19.5 6.78a5.6 5.6 0 0 1-3.74-1.32 5.62 5.62 0 0 1-1.42-2.6h-3.27v11.31a2.6 2.6 0 1 1-1.83-2.49V8.36a5.9 5.9 0 1 0 5.1 5.85V9.34a8.84 8.84 0 0 0 5.16 1.65V7.7Z" />
              </svg>
            </SocialIconLink>
          </nav>
        </div>

        <div className="mt-10 border-t border-ink-inverse/15 pt-6 text-center text-xs text-ink-inverse/70">
          © {new Date().getFullYear()} PetWalker, Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function SocialIconLink({
  href,
  label,
  children,
}: PropsWithChildren<{ href: string; label: string }>): JSX.Element {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink-inverse/10 text-ink-inverse transition-colors hover:bg-ink-inverse/20 hover:text-brand-300"
    >
      {children}
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────────────────────────

export const metadata = {
  title: 'petwalker — pet care, a tap away',
  description:
    'Walking, sitting, grooming, vet visits, and more. Find a trusted local pet pro, book in seconds, and watch every walk live.',
};
