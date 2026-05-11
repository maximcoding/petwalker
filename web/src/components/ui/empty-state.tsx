import type { JSX, ReactNode } from 'react';

/**
 * EmptyState — illustration → headline → subcopy → primary action,
 * optionally a secondary text link. Every list/feed/search-no-results
 * screen in dogwalk uses this component (per the brief: "never a
 * blank screen").
 *
 * The illustration slot accepts an `<Image />`, an inline SVG, or a
 * plain CSS gradient block. Until the photo pipeline lands (PR #2),
 * pass a gradient swatch via the `<Image />` source or use the
 * built-in `gradient` slot.
 */
export interface EmptyStateProps {
  /** Custom illustration node — overrides `gradient`. */
  illustration?: ReactNode;
  /** Pick a token gradient if you don't have an illustration yet. */
  gradient?: 'sunset' | 'meadow' | 'sky' | 'warm';
  headline: string;
  subcopy?: string;
  primary?: { label: string; onClick?: () => void; href?: string };
  secondary?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

const GRADIENT_CLASS = {
  sunset: 'bg-gradient-sunset',
  meadow: 'bg-gradient-meadow',
  sky: 'bg-gradient-sky',
  warm: 'bg-gradient-warm',
} as const;

export function EmptyState({
  illustration,
  gradient,
  headline,
  subcopy,
  primary,
  secondary,
  className = '',
}: EmptyStateProps): JSX.Element {
  return (
    <div
      className={`mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-6 py-12 text-center ${className}`}
    >
      <div
        className={`mb-2 h-32 w-32 rounded-2xl ${gradient ? GRADIENT_CLASS[gradient] : 'bg-warm-100'} flex items-center justify-center overflow-hidden`}
      >
        {illustration}
      </div>
      <h2 className="text-xl font-semibold text-ink-primary">{headline}</h2>
      {subcopy && (
        <p className="text-sm text-ink-secondary">{subcopy}</p>
      )}
      {primary && (
        <div className="mt-2 flex flex-col items-center gap-2">
          {primary.href ? (
            <a
              href={primary.href}
              className="inline-flex min-h-touch items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-ink-inverse transition-colors hover:bg-brand-700"
            >
              {primary.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={primary.onClick}
              className="inline-flex min-h-touch items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-ink-inverse transition-colors hover:bg-brand-700"
            >
              {primary.label}
            </button>
          )}
          {secondary && (
            <>
              {secondary.href ? (
                <a
                  href={secondary.href}
                  className="text-sm font-medium text-ink-link transition-colors hover:text-ink-link-hover"
                >
                  {secondary.label}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={secondary.onClick}
                  className="text-sm font-medium text-ink-link transition-colors hover:text-ink-link-hover"
                >
                  {secondary.label}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
