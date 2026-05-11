import { MapPin } from 'lucide-react';
import type { JSX } from 'react';

/**
 * MapPlaceholder — typed stub for future Mapbox/Google integration.
 *
 * Renders a styled rectangle so screens that depend on a map can be
 * built end-to-end (Discovery, BookingDetail location card, Live
 * Tracking) without committing to a provider yet. The eventual real
 * Map component must keep this prop shape so callers don't change.
 *
 * Replace in the M-Maps phase per
 * .claude/skills/dogwalk-design/references/phases.md.
 */
export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

export interface MapPlaceholderProps {
  pins?: MapPin[];
  center?: { lat: number; lng: number };
  /** Service radius circle (informational only in the placeholder). */
  radiusKm?: number;
  /** Tailwind aspect helper, e.g. `aspect-[16/9]` or `aspect-square`. */
  aspect?: string;
  /** When true, render compact (no overlay text), useful in cards. */
  compact?: boolean;
  className?: string;
}

export function MapPlaceholder({
  pins = [],
  center,
  radiusKm,
  aspect = 'aspect-[16/9]',
  compact = false,
  className = '',
}: MapPlaceholderProps): JSX.Element {
  return (
    <div
      role="img"
      aria-label={`Map placeholder${pins.length ? ` with ${pins.length} pin${pins.length === 1 ? '' : 's'}` : ''}`}
      className={`relative w-full overflow-hidden rounded-xl border border-border-subtle bg-gradient-meadow ${aspect} ${className}`}
    >
      {/* Faint grid background — looks map-like without any tiles */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Center "you are here" pin */}
      {center && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <MapPin className="h-7 w-7 text-brand-600 drop-shadow" aria-hidden />
        </div>
      )}
      {/* Coverage radius indicator (visual only) */}
      {radiusKm && (
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 rounded-full border-2 border-brand-400 border-dashed bg-brand-200/30"
          style={{
            width: `${Math.min(radiusKm * 8, 80)}%`,
            height: `${Math.min(radiusKm * 8, 80)}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
      {!compact && (
        <p className="absolute bottom-2 end-2 rounded-md bg-surface-raised/90 px-2.5 py-1 text-[11px] font-medium text-ink-tertiary">
          Map placeholder
        </p>
      )}
    </div>
  );
}
