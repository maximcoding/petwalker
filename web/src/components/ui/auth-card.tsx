'use client';

import { ArrowLeft } from 'lucide-react';
import type { JSX, PropsWithChildren, ReactNode } from 'react';

/**
 * AuthCard — shared wrapper around auth-flow content. Renders a
 * vertically-centered card with the standard rounded-2xl frame,
 * warm-tinted shadow, and an optional small eyebrow + headline
 * + subcopy slot above the children.
 *
 * Use for /sign-in, /confirm, edge-case screens. Pair with the
 * gradient-orb (auth)/layout.tsx for the same backdrop everywhere.
 */
export interface AuthCardProps extends PropsWithChildren {
  /** Small ALL-CAPS pill above the headline (e.g. "Step 1 of 3"). */
  eyebrow?: ReactNode;
  /** Large display heading. */
  headline?: ReactNode;
  /** One-line muted subtitle under the headline. */
  subcopy?: ReactNode;
  /** Optional content rendered below the children (footer-style links). */
  footer?: ReactNode;
  /**
   * When provided, renders a "Back" button in the top-start corner
   * of the card. The button sits above the headline so the header
   * remains centered. Clicking calls `onBack`.
   */
  onBack?: () => void;
  /** Visible label for the back button (defaults to "Back"). */
  backLabel?: string;
  className?: string;
}

export function AuthCard({
  eyebrow,
  headline,
  subcopy,
  footer,
  onBack,
  backLabel = 'Back',
  className = '',
  children,
}: AuthCardProps): JSX.Element {
  return (
    <div className={'mx-auto w-full max-w-md ' + className}>
      {/* Top-of-card back nav slot — height is reserved unconditionally
          (h-9 + mb-4 = 52px) so flipping `onBack` between false/true
          between views doesn't bounce the card. Button is rendered
          inside only when `onBack` is set. */}
      <div className="mb-4 flex h-9">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ms-2 inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-warm-100 hover:text-ink-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </button>
        )}
      </div>

      {(eyebrow || headline || subcopy) && (
        <header className="mb-6 text-center">
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
              {eyebrow}
            </p>
          )}
          {headline && (
            // Locked to a single size across breakpoints — the
            // previous `text-2xl sm:text-3xl` bumped the headline at
            // 640px, which made the card visibly jump on resize.
            <h1 className="text-3xl font-bold tracking-tight text-ink-primary">
              {headline}
            </h1>
          )}
          {subcopy !== undefined && (
            <p className="mt-2 text-sm leading-snug text-ink-secondary">
              {subcopy}
            </p>
          )}
        </header>
      )}
      {children}
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
}
