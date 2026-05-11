import type { JSX, ReactNode } from 'react';

/**
 * Divider — horizontal rule with optional centered label.
 *
 *   <Divider />                    → plain line
 *   <Divider>or continue with</Divider>  → labelled separator for auth flows
 */
export interface DividerProps {
  children?: ReactNode;
  className?: string;
}

export function Divider({ children, className = '' }: DividerProps): JSX.Element {
  if (!children) {
    return (
      <hr
        aria-hidden
        className={`border-0 border-t border-border-subtle ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-tertiary ${className}`}
    >
      <span aria-hidden className="h-px flex-1 bg-border-subtle" />
      <span>{children}</span>
      <span aria-hidden className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
