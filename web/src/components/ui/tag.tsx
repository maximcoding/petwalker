'use client';

import { X } from 'lucide-react';
import type { ButtonHTMLAttributes, JSX, PropsWithChildren } from 'react';

import type { PillHue } from './pill';

/**
 * Tag — interactive chip used for filters, service categories, recent
 * searches, etc. Pulls hue tokens from the same palette as <Pill>.
 *
 * Two interaction modes:
 *   - Pressable (default): toggleable filter / category selector with
 *     a "selected" state. Renders as a <button>.
 *   - Removable: shows an X icon; calls `onRemove` when clicked.
 *
 * Render plain text via children.
 */
export interface TagProps
  extends PropsWithChildren<Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>> {
  hue?: PillHue;
  selected?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

const SIZE_CLASS = {
  sm: 'h-7 px-2.5 text-xs gap-1',
  md: 'h-9 px-3 text-sm gap-1.5',
} as const;

/* Selected: solid hue background, inverse ink. */
const SELECTED_BG: Record<PillHue, string> = {
  brand: 'bg-brand-600 text-ink-inverse border-brand-600',
  coral: 'bg-coral-500 text-ink-inverse border-coral-500',
  sunshine: 'bg-sunshine-400 text-warm-900 border-sunshine-400',
  mint: 'bg-mint-500 text-ink-inverse border-mint-500',
  sky: 'bg-sky-500 text-ink-inverse border-sky-500',
  lavender: 'bg-lavender-500 text-ink-inverse border-lavender-500',
  peach: 'bg-peach-500 text-ink-inverse border-peach-500',
  warm: 'bg-warm-700 text-ink-inverse border-warm-700',
};

/* Idle: surface background, hue-tinted border + text. */
const IDLE_BG: Record<PillHue, string> = {
  brand: 'bg-surface-raised text-brand-700 border-brand-200 hover:bg-brand-50',
  coral: 'bg-surface-raised text-coral-700 border-coral-200 hover:bg-coral-50',
  sunshine: 'bg-surface-raised text-sunshine-700 border-sunshine-300 hover:bg-sunshine-50',
  mint: 'bg-surface-raised text-mint-700 border-mint-200 hover:bg-mint-50',
  sky: 'bg-surface-raised text-sky-700 border-sky-200 hover:bg-sky-50',
  lavender: 'bg-surface-raised text-lavender-700 border-lavender-200 hover:bg-lavender-50',
  peach: 'bg-surface-raised text-peach-700 border-peach-200 hover:bg-peach-50',
  warm: 'bg-surface-raised text-warm-700 border-warm-300 hover:bg-warm-100',
};

export function Tag({
  hue = 'brand',
  selected = false,
  removable = false,
  onRemove,
  size = 'sm',
  className = '',
  children,
  type = 'button',
  ...rest
}: TagProps): JSX.Element {
  const palette = selected ? SELECTED_BG[hue] : IDLE_BG[hue];
  return (
    <button
      type={type}
      aria-pressed={!removable ? selected : undefined}
      className={`inline-flex items-center rounded-pill border font-medium transition-colors ${palette} ${SIZE_CLASS[size]} ${className}`}
      {...rest}
    >
      <span>{children}</span>
      {removable && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Remove"
          onClick={(e): void => {
            e.stopPropagation();
            onRemove?.();
          }}
          onKeyDown={(e): void => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRemove?.();
            }
          }}
          className="ms-0.5 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full hover:bg-warm-900/10"
        >
          <X className="h-3 w-3" aria-hidden />
        </span>
      )}
    </button>
  );
}
