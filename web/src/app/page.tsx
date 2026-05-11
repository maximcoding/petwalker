import { ArrowRight, PawPrint } from 'lucide-react';
import Link from 'next/link';

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
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-surface-base">
      {/* Decorative gradient orbs — purely cosmetic, hidden from a11y */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -end-32 h-96 w-96 rounded-full bg-gradient-sunset opacity-60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -start-40 h-[28rem] w-[28rem] rounded-full bg-gradient-meadow opacity-60 blur-3xl"
      />

      {/* Top bar — minimal */}
      <header className="relative z-elevated">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-ink-primary"
          >
            <span
              aria-hidden
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-ink-inverse"
            >
              <PawPrint className="h-4 w-4" />
            </span>
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
              href="/sign-up"
              className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-ink-inverse transition-colors hover:bg-brand-700"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-base flex flex-1 items-center">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-pill bg-surface-raised px-4 py-1.5 text-xs font-semibold text-ink-secondary shadow-subtle ring-1 ring-border-subtle">
              <span className="inline-block h-2 w-2 rounded-full bg-mint-500" />
              For owners · For walkers
            </div>
            <h1 className="text-balance text-5xl font-extrabold tracking-tight text-ink-primary sm:text-6xl lg:text-7xl">
              Pet care, <span className="text-brand-600">a tap away.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-ink-secondary sm:text-lg">
              Walking, sitting, grooming, vet visits, and more. Find a trusted local
              pro, book in seconds, and watch every walk live.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
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
                terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-ink-link hover:underline">
                privacy policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Footer — minimal */}
      <footer className="relative z-elevated border-t border-border-subtle bg-surface-raised/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-ink-tertiary sm:flex-row sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} PetWalker, Inc.</span>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="/about" className="hover:text-ink-primary">
              About
            </Link>
            <Link href="/privacy" className="hover:text-ink-primary">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink-primary">
              Terms
            </Link>
            <Link href="/design" className="hover:text-ink-primary">
              Design system
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
