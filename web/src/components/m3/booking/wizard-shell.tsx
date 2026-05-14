'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { JSX, PropsWithChildren, ReactNode } from 'react';

/**
 * WizardShell — app-shell-style scaffold.
 *
 * Layout: fixed chrome top, fixed chrome bottom, scrollable middle.
 *
 *   ┌─────────────────────────────────────────┐
 *   │ FIXED:  back link  ·  step dots         │  ← always visible
 *   ├─────────────────────────────────────────┤
 *   │ FIXED:  step eyebrow                    │  ← always visible
 *   │         step title                      │
 *   │         step subtitle (optional)        │
 *   ├─────────────────────────────────────────┤
 *   │ SCROLLS: step body / lists              │  ← only this scrolls
 *   │          ...                            │
 *   ├─────────────────────────────────────────┤
 *   │ FIXED:  back · price slot · continue    │  ← always visible
 *   └─────────────────────────────────────────┘
 *
 * Sized at `h-[calc(100dvh-3.5rem)]` to fit underneath the app top
 * chrome (~56px). `flex flex-col` + `min-h-0` on the body lets the
 * scrollable region take exactly the remaining height — never less,
 * never more, never letting the headings slide out of view.
 *
 * The heading is PART of the fixed chrome, so step h1 / eyebrow /
 * subtitle stay anchored even as long lists scroll within the body.
 */
export function WizardShell({
  exitHref,
  exitLabel = 'Back',
  totalSteps,
  currentStep,
  stepEyebrow,
  stepTitle,
  stepSubtitle,
  onBack,
  onNext,
  nextLabel = 'Continue',
  canAdvance,
  busy = false,
  priceSlot,
  children,
}: PropsWithChildren<{
  exitHref: string;
  exitLabel?: string;
  totalSteps: number;
  currentStep: number;
  /** Small ALL-CAPS pill above the title (e.g. "STEP 2 · WHEN"). */
  stepEyebrow?: ReactNode;
  /** Step page heading — stays fixed above the scrolling body. */
  stepTitle: ReactNode;
  /** Optional one-line caption under the title. */
  stepSubtitle?: ReactNode;
  onBack: (() => void) | null;
  onNext: () => void;
  nextLabel?: string;
  canAdvance: boolean;
  busy?: boolean;
  /** Optional live-price block rendered in the bottom bar (lg+). */
  priceSlot?: ReactNode;
}>): JSX.Element {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-base">
      {/* FIXED chrome: top bar + step heading */}
      <header className="shrink-0 border-b border-border-subtle bg-surface-base/95 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href={exitHref}
            className="inline-flex items-center gap-1.5 truncate text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{exitLabel}</span>
          </Link>
          <DotSteps total={totalSteps} current={currentStep} />
        </div>

        {/* One-line layout — eyebrow pill + title + subtitle flow
            inline on wide screens (the chrome row has plenty of
            horizontal space). Wraps naturally on narrow mobile
            widths via `flex-wrap`. Saves vertical chrome height
            so the scrollable body gets more room. */}
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pb-3 pt-1 sm:px-6">
          {stepEyebrow ? (
            <p className="inline-flex shrink-0 items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-700">
              {stepEyebrow}
            </p>
          ) : null}
          <h1 className="text-balance text-xl font-extrabold leading-tight tracking-tight text-ink-primary sm:text-2xl">
            {stepTitle}
          </h1>
          {stepSubtitle ? (
            <p className="text-sm text-ink-secondary">{stepSubtitle}</p>
          ) : null}
        </div>
      </header>

      {/* SCROLLABLE body — flex-1 + min-h-0 = exactly the
          remaining height; overflow-y-auto = the fallback scroller
          for steps that don't manage their own height.

          The inner wrapper is `h-full` so a step that opts into its
          own internal-scroll layout (e.g. Step 2's `flex h-full
          flex-col`) gets a real bounded height to fill. Steps that
          don't (1/3/4/5) just render shorter content inside the
          h-full box and let `main` scroll if they ever overflow. */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto h-full w-full max-w-3xl px-4 py-5 sm:px-6">
          {children}
        </div>
      </main>

      {/* FIXED chrome bottom: back · price · continue */}
      <StepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel={nextLabel}
        canAdvance={canAdvance}
        busy={busy}
        priceSlot={priceSlot}
      />
    </div>
  );
}

function DotSteps({ total, current }: { total: number; current: number }): JSX.Element {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label="Wizard progress"
      className="flex items-center gap-1.5"
    >
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1;
        const state = idx < current ? 'done' : idx === current ? 'active' : 'todo';
        return (
          <span
            key={i}
            className={[
              'h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none',
              state === 'active' ? 'w-6 bg-brand-600' : '',
              state === 'done' ? 'w-1.5 bg-brand-600' : '',
              state === 'todo' ? 'w-1.5 bg-warm-200' : '',
            ].join(' ')}
            aria-hidden
          />
        );
      })}
      <span className="ms-2 text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
        {current}/{total}
      </span>
    </div>
  );
}

function StepFooter({
  onBack,
  onNext,
  nextLabel,
  canAdvance,
  busy,
  priceSlot,
}: {
  onBack: (() => void) | null;
  onNext: () => void;
  nextLabel: string;
  canAdvance: boolean;
  busy: boolean;
  priceSlot?: ReactNode;
}): JSX.Element {
  return (
    <div className="shrink-0 border-t border-border-subtle bg-surface-base shadow-overlay">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => onBack?.()}
          disabled={!onBack || busy}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink-secondary transition-colors hover:bg-warm-100 hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-0"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>

        <div className="hidden flex-1 sm:block">{priceSlot}</div>

        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance || busy}
          className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-base font-semibold text-ink-inverse shadow-subtle transition-all hover:bg-brand-700 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:px-8"
        >
          {busy ? 'Working…' : nextLabel}
          {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

/**
 * Re-exported for callers that want to render an in-body section
 * header (NOT the fixed step heading — that's a shell prop now).
 */
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
    <div className="mb-6">
      {eyebrow ? (
        <p className="mb-1.5 inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-700">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-balance text-xl font-extrabold leading-tight tracking-tight text-ink-primary">
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p> : null}
    </div>
  );
}
