'use client';

import { Check, Cloud, Moon, Sun } from 'lucide-react';
import type { JSX, ReactNode } from 'react';

/**
 * PartBlock — one of the three Mornings / Afternoons / Evenings cards.
 *
 * Used in two places: the AI Smart picker (multi-select preference)
 * and the Specific-times-per-day picker (multi-select filter). The
 * component is purely presentational; the caller owns the selection
 * state and decides what `count` means.
 *
 * Design tokens (per M1 palette):
 *   morning   → sunshine (warm yellow)
 *   afternoon → peach (coral-orange)
 *   evening   → lavender (purple)
 *
 * Variant C from the design preview Maxim approved 2026-05-13:
 *   icon top-left, checkbox-ish indicator top-right, label + sub
 *   stacked below, footer row with the count + "slots" / "none".
 */

export type Part = 'morning' | 'afternoon' | 'evening';

export const PART_META: Record<
  Part,
  { label: string; sub: string; icon: ReactNode }
> = {
  morning: {
    label: 'Mornings',
    sub: '6 AM – noon',
    icon: <Sun className="h-5 w-5" aria-hidden />,
  },
  afternoon: {
    label: 'Afternoons',
    sub: 'Noon – 5 PM',
    icon: <Cloud className="h-5 w-5" aria-hidden />,
  },
  evening: {
    label: 'Evenings',
    sub: '5 PM – 9 PM',
    icon: <Moon className="h-5 w-5" aria-hidden />,
  },
};

interface Props {
  tone: Part;
  count: number;
  selected: boolean;
  onToggle: () => void;
  /** Override the unit label under the count (default "slots"). */
  unit?: string;
}

export function PartBlock({
  tone,
  count,
  selected,
  onToggle,
  unit = 'slots',
}: Props): JSX.Element {
  const disabled = count === 0;
  const meta = PART_META[tone];

  // Static class strings — Tailwind JIT can't synthesise these.
  const toneCls: Record<Part, { sel: string; idle: string; text: string; border: string }> = {
    morning: {
      sel: 'border-sunshine-400 bg-sunshine-100',
      idle: 'border-border-subtle bg-surface-raised hover:border-sunshine-300',
      text: 'text-sunshine-800',
      border: 'border-sunshine-300/40',
    },
    afternoon: {
      sel: 'border-peach-400 bg-peach-100',
      idle: 'border-border-subtle bg-surface-raised hover:border-peach-300',
      text: 'text-peach-800',
      border: 'border-peach-300/40',
    },
    evening: {
      sel: 'border-lavender-400 bg-lavender-100',
      idle: 'border-border-subtle bg-surface-raised hover:border-lavender-300',
      text: 'text-lavender-800',
      border: 'border-lavender-300/40',
    },
  };
  const cls = toneCls[tone];

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={[
        'flex flex-col items-start rounded-2xl border-2 p-3 text-start transition-colors',
        disabled
          ? 'cursor-not-allowed border-dashed border-border-subtle bg-surface-base opacity-50'
          : selected
            ? cls.sel
            : cls.idle,
      ].join(' ')}
    >
      <div className="mb-2 flex w-full items-center justify-between">
        <span className={disabled ? 'text-ink-tertiary' : cls.text}>{meta.icon}</span>
        <span
          className={[
            'inline-flex h-4 w-4 items-center justify-center rounded border-2',
            selected
              ? 'border-brand-600 bg-brand-600 text-ink-inverse'
              : 'border-border-strong bg-surface-base',
          ].join(' ')}
          aria-hidden
        >
          {selected ? <Check className="h-3 w-3" aria-hidden /> : null}
        </span>
      </div>
      <span
        className={[
          'text-sm font-bold',
          disabled ? 'text-ink-tertiary' : cls.text,
        ].join(' ')}
      >
        {meta.label}
      </span>
      <span
        className={[
          'text-[10px]',
          disabled ? 'text-ink-tertiary' : cls.text,
          disabled ? '' : 'opacity-80',
        ].join(' ')}
      >
        {meta.sub}
      </span>
      <div
        className={[
          'mt-2 flex w-full items-baseline justify-between border-t pt-2',
          disabled ? 'border-border-subtle' : cls.border,
        ].join(' ')}
      >
        <span
          className={[
            'text-lg font-extrabold leading-none',
            disabled ? 'text-ink-tertiary' : cls.text,
          ].join(' ')}
        >
          {count}
        </span>
        <span
          className={[
            'text-[10px] font-medium',
            disabled ? 'text-ink-tertiary' : cls.text,
            disabled ? '' : 'opacity-80',
          ].join(' ')}
        >
          {count === 0 ? 'none' : unit}
        </span>
      </div>
    </button>
  );
}
