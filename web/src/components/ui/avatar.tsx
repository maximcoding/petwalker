import Image from 'next/image';
import type { JSX } from 'react';

/**
 * Avatar — round image with text fallback. Sizes match the design
 * system's touch / chrome scale.
 *
 *   xs → 24px (chips, inline mentions)
 *   sm → 32px (chat bubbles, list rows)
 *   md → 40px (default — header, user menu trigger)
 *   lg → 56px (provider/owner card hero)
 *   xl → 96px (profile detail)
 */
export interface AvatarProps {
  src?: string | null;
  alt: string;
  /** Two-letter initials shown when `src` is missing. Auto-derived from `alt` if absent. */
  initials?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show a small green dot indicating online status. */
  online?: boolean;
  className?: string;
}

const SIZE_PX = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 96,
} as const;

const SIZE_CLASS = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
} as const;

const DOT_SIZE_CLASS = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
} as const;

function deriveInitials(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({
  src,
  alt,
  initials,
  size = 'md',
  online = false,
  className = '',
}: AvatarProps): JSX.Element {
  const px = SIZE_PX[size];
  const dotClass = DOT_SIZE_CLASS[size];
  const text = initials ?? deriveInitials(alt);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-warm-200 font-semibold text-warm-700 ${SIZE_CLASS[size]} ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={px}
          height={px}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{text}</span>
      )}
      {online && (
        <span
          aria-label="Online"
          className={`absolute end-0 bottom-0 rounded-full bg-status-success ring-2 ring-surface-raised ${dotClass}`}
        />
      )}
    </span>
  );
}
