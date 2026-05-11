import type { JSX } from 'react';

/**
 * Badge — small numeric/dot indicator. Used on the bell, message tab,
 * per-thread rows, etc. Renders as a centered count when given a
 * positive number; renders as a tiny dot when `variant="dot"`.
 *
 *   <Badge count={3} />            → "3"
 *   <Badge count={120} max={99} /> → "99+"
 *   <Badge variant="dot" />         → small filled dot
 */
export interface BadgeProps {
  count?: number;
  max?: number;
  variant?: 'count' | 'dot';
  /** Hue family — defaults to coral for unread / attention. */
  hue?: 'coral' | 'brand' | 'mint' | 'sunshine' | 'sky' | 'lavender';
  className?: string;
}

const HUE_BG = {
  coral: 'bg-coral-500',
  brand: 'bg-brand-600',
  mint: 'bg-mint-500',
  sunshine: 'bg-sunshine-500',
  sky: 'bg-sky-500',
  lavender: 'bg-lavender-500',
} as const;

export function Badge({
  count,
  max = 99,
  variant = 'count',
  hue = 'coral',
  className = '',
}: BadgeProps): JSX.Element | null {
  if (variant === 'count' && (!count || count <= 0)) return null;
  const bg = HUE_BG[hue];
  if (variant === 'dot') {
    return (
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${bg} ${className}`}
      />
    );
  }
  const display = count! > max ? `${max}+` : String(count);
  return (
    <span
      className={`inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none text-ink-inverse ${bg} ${className}`}
    >
      {display}
    </span>
  );
}
