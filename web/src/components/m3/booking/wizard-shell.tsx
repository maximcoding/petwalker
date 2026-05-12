'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { JSX, PropsWithChildren, ReactNode } from 'react';

/**
 * WizardShell — sticky-top + sticky-footer scaffolding shared by
 * every step of /booking/new. Children render the per-step content.
 *
 * Design choices:
 *  • Sticky footer keeps the primary CTA thumb-reachable on mobile.
 *  • Header has a contextual back link (e.g., back to provider
 *    profile) — separate from the wizard's Back button which steps
 *    backward through the form.
 *  • ProgressBar lives directly under the header so the user always
 *    sees how far along they are.
 */
export function WizardShell({
  exitHref,
  exitLabel = 'Back',
  totalSteps,
  currentStep,
  onBack,
  onNext,
  nextLabel = 'Continue',
  canAdvance,
  busy = false,
  children,
}: PropsWithChildren<{
  exitHref: string;
  exitLabel?: string;
  totalSteps: number;
  currentStep: number;
  onBack: (() => void) | null;
  onNext: () => void;
  nextLabel?: string;
  canAdvance: boolean;
  busy?: boolean;
}>): JSX.Element {
  return (
    <div className="relative flex min-h-screen flex-col bg-surface-base">
      {/* Sticky top — exit + step counter */}
      <header className="sticky top-0 z-sticky border-b border-border-subtle bg-surface-base/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link
            href={exitHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {exitLabel}
          </Link>
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        <ProgressBar totalSteps={totalSteps} currentStep={currentStep} />
      </header>

      {/* Step content */}
      <main className="flex-1 px-4 pb-32 pt-8 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </main>

      {/* Sticky bottom — Back + Continue */}
      <StepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel={nextLabel}
        canAdvance={canAdvance}
        busy={busy}
      />
    </div>
  );
}

function ProgressBar({
  totalSteps,
  currentStep,
}: {
  totalSteps: number;
  currentStep: number;
}): JSX.Element {
  const pct = (currentStep / totalSteps) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep}
      aria-label="Booking progress"
      className="h-1 w-full bg-warm-100"
    >
      <div
        className="h-full bg-brand-600 transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StepFooter({
  onBack,
  onNext,
  nextLabel,
  canAdvance,
  busy,
}: {
  onBack: (() => void) | null;
  onNext: () => void;
  nextLabel: string;
  canAdvance: boolean;
  busy: boolean;
}): JSX.Element {
  return (
    <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-border-subtle bg-surface-base/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => onBack?.()}
          disabled={!onBack || busy}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-ink-secondary transition-colors hover:bg-warm-100 hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-0"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance || busy}
          className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-base font-semibold text-ink-inverse transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:px-8"
        >
          {busy ? 'Working…' : nextLabel}
          {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

export function StepHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
}): JSX.Element {
  return (
    <div className="mb-8">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-700">
          {eyebrow}
        </p>
      )}
      <h1 className="text-balance text-2xl font-extrabold tracking-tight text-ink-primary sm:text-3xl">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{subtitle}</p>}
    </div>
  );
}
