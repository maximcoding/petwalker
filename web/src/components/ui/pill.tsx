import type { HTMLAttributes, JSX, PropsWithChildren } from 'react';

/**
 * Pill — small rounded label used for statuses, role badges, and
 * verified marks. Pulls from the multi-hue token palette so each
 * meaning has a consistent colour treatment across the app.
 *
 * Two intensities:
 *   tone="soft"   — pale background + bold ink (default)
 *   tone="solid"  — saturated background + inverse ink (high-contrast)
 *
 * Hue is required so the API forces an intentional choice rather than
 * a "default grey" that drifts into design.
 */
export type PillHue =
  | 'brand'
  | 'coral'
  | 'sunshine'
  | 'mint'
  | 'sky'
  | 'lavender'
  | 'peach'
  | 'warm';

export interface PillProps
  extends PropsWithChildren<HTMLAttributes<HTMLSpanElement>> {
  hue: PillHue;
  tone?: 'soft' | 'solid';
  size?: 'sm' | 'md';
}

/* Soft tone: -100 background + -700 ink. Solid: -500 background + inverse ink. */
const SOFT_BG: Record<PillHue, string> = {
  brand: 'bg-brand-100 text-brand-700',
  coral: 'bg-coral-100 text-coral-700',
  sunshine: 'bg-sunshine-100 text-sunshine-700',
  mint: 'bg-mint-100 text-mint-700',
  sky: 'bg-sky-100 text-sky-700',
  lavender: 'bg-lavender-100 text-lavender-700',
  peach: 'bg-peach-100 text-peach-700',
  warm: 'bg-warm-100 text-warm-700',
};

const SOLID_BG: Record<PillHue, string> = {
  brand: 'bg-brand-600 text-ink-inverse',
  coral: 'bg-coral-600 text-ink-inverse',
  sunshine: 'bg-sunshine-500 text-warm-900',
  mint: 'bg-mint-500 text-ink-inverse',
  sky: 'bg-sky-500 text-ink-inverse',
  lavender: 'bg-lavender-600 text-ink-inverse',
  peach: 'bg-peach-500 text-ink-inverse',
  warm: 'bg-warm-700 text-ink-inverse',
};

const SIZE_CLASS = {
  sm: 'h-5 px-2 text-[11px]',
  md: 'h-6 px-2.5 text-xs',
} as const;

export function Pill({
  hue,
  tone = 'soft',
  size = 'sm',
  className = '',
  children,
  ...rest
}: PillProps): JSX.Element {
  const palette = tone === 'soft' ? SOFT_BG[hue] : SOLID_BG[hue];
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-pill font-semibold leading-none ${palette} ${SIZE_CLASS[size]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------
 * BookingStatusPill — semantic helper around <Pill>. The hue map
 * mirrors the booking lifecycle reference. Keep in sync with
 * .claude/skills/dogwalk-design/references/booking-lifecycle.md.
 * ------------------------------------------------------------------ */

export type BookingStatusToken =
  | 'pending'
  | 'confirmed'
  | 'inProgress'
  | 'completed'
  | 'cancelled'
  | 'inDispute';

const STATUS_HUE: Record<BookingStatusToken, PillHue> = {
  pending: 'sunshine',
  confirmed: 'sky',
  inProgress: 'mint',
  completed: 'warm',
  cancelled: 'coral',
  inDispute: 'lavender',
};

const STATUS_LABEL_KEY: Record<BookingStatusToken, string> = {
  pending: 'booking.status.pending',
  confirmed: 'booking.status.confirmed',
  inProgress: 'booking.status.inProgress',
  completed: 'booking.status.completed',
  cancelled: 'booking.status.cancelled',
  inDispute: 'booking.status.inDispute',
};

const STATUS_DEFAULT: Record<BookingStatusToken, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  inProgress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  inDispute: 'In dispute',
};

export const bookingStatusKey = (status: BookingStatusToken): string =>
  STATUS_LABEL_KEY[status];

export const bookingStatusDefault = (status: BookingStatusToken): string =>
  STATUS_DEFAULT[status];

export const bookingStatusHue = (status: BookingStatusToken): PillHue =>
  STATUS_HUE[status];
