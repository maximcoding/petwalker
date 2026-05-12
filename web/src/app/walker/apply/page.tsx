import { ArrowLeft, ArrowRight, ClipboardCheck, MapPin, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';

/**
 * `/walker/apply` — walker recruitment stub.
 *
 * The marketing landing's "Apply to walk" CTA points here. The full
 * walker onboarding flow (KYC, payouts, service area, photos, intro
 * video) lives in M2a #16 and is not yet built. This page exists so
 * the CTA doesn't 404, while being honest about state: applications
 * aren't open yet.
 *
 * No email-capture form here — we deliberately don't collect contact
 * info we can't act on. When the real onboarding ships, swap this
 * page for the wizard.
 *
 * See docs/landing-page-spec.md (Walker pivot section) for context.
 */
export default function WalkerApplyStubPage(): JSX.Element {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-meadow">
      {/* Decorative blur orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -end-32 -top-32 h-96 w-96 rounded-full bg-gradient-sky opacity-50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -start-40 h-[28rem] w-[28rem] rounded-full bg-gradient-sunset opacity-50 blur-3xl"
      />

      <header className="relative z-elevated">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-inverse/90 transition-colors hover:text-ink-inverse"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to petwalker
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center rounded-lg bg-ink-primary px-4 text-sm font-semibold text-ink-inverse transition-colors hover:bg-warm-900"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="relative z-base flex flex-1 items-center">
        <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center text-ink-inverse lg:px-8 lg:py-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-inverse/85">
            For pet pros
          </p>
          <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Walker applications open soon.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-ink-inverse/90 sm:text-lg">
            We're building a thoughtful application flow — identity verification,
            service-area selection, payout setup — so the experience is right from day
            one. Sign up for a petwalker account now, and you'll be ready to apply the
            moment we open.
          </p>

          {/* Three soft cards previewing what's coming */}
          <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
            <PreviewCard
              icon={<ClipboardCheck className="h-5 w-5" aria-hidden />}
              title="Verified profile"
            >
              Identity, background, and references — the trust signal pet parents look
              for.
            </PreviewCard>
            <PreviewCard
              icon={<MapPin className="h-5 w-5" aria-hidden />}
              title="Your service area"
            >
              Pick neighborhoods and hours. Get matched with bookings that fit your
              schedule.
            </PreviewCard>
            <PreviewCard
              icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
              title="Secure payouts"
            >
              Direct deposit after each completed walk. No invoicing, no chasing
              payment.
            </PreviewCard>
          </div>

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-in"
              className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-lg bg-ink-primary px-6 text-base font-semibold text-ink-inverse transition-colors hover:bg-warm-900 sm:w-auto"
            >
              Create an account
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-touch w-full items-center justify-center rounded-lg border border-ink-inverse/40 bg-ink-inverse/10 px-6 text-base font-semibold text-ink-inverse transition-colors hover:bg-ink-inverse/20 sm:w-auto"
            >
              Back to petwalker
            </Link>
          </div>

          <p className="mt-10 text-xs text-ink-inverse/70">
            Questions in the meantime? <Link href="/contact" className="underline underline-offset-2 hover:text-ink-inverse">Get in touch</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}

function PreviewCard({
  icon,
  title,
  children,
}: {
  icon: JSX.Element;
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-ink-inverse/20 bg-ink-inverse/10 p-5 text-start">
      <span
        aria-hidden
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-ink-inverse/20 text-ink-inverse"
      >
        {icon}
      </span>
      <h2 className="mt-3 text-sm font-bold text-ink-inverse">{title}</h2>
      <p className="mt-1 text-xs text-ink-inverse/85">{children}</p>
    </div>
  );
}

export const metadata = {
  title: 'Become a petwalker pro — applications open soon',
  description:
    'We are building a thoughtful walker application — verification, service area, payouts. Sign up to be ready when applications open.',
};
