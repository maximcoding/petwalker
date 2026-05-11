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
  className?: string;
}

export function AuthCard({
  eyebrow,
  headline,
  subcopy,
  footer,
  className = '',
  children,
}: AuthCardProps): JSX.Element {
  return (
    <div
      className={
        'mx-auto w-full max-w-md rounded-2xl border border-border-subtle bg-surface-raised p-6 shadow-card sm:p-8 ' +
        className
      }
    >
      {(eyebrow || headline || subcopy) && (
        <header className="mb-6">
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
              {eyebrow}
            </p>
          )}
          {headline && (
            <h1 className="text-2xl font-bold tracking-tight text-ink-primary sm:text-3xl">
              {headline}
            </h1>
          )}
          {subcopy && (
            <p className="mt-2 text-sm text-ink-secondary">{subcopy}</p>
          )}
        </header>
      )}
      {children}
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
}
