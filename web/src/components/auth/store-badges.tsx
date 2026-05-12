import type { JSX } from 'react';

/**
 * GooglePlayBadge + AppStoreBadge — vendor download marks for the
 * auth layout's left pane. Hand-built SVG (no third-party asset) so
 * the colour matches our token system; the geometry follows the
 * official badge proportions. These are clickable wrappers — set
 * `href` on the parent <Link> / <a>.
 */
export function AppStoreBadge(): JSX.Element {
  return (
    <span
      className="inline-flex h-12 items-center gap-2.5 rounded-lg bg-warm-900 px-4 text-ink-inverse transition-colors hover:bg-warm-800"
      role="img"
      aria-label="Download on the App Store"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="currentColor" aria-hidden>
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-normal opacity-80">Download on the</span>
        <span className="text-base font-semibold">App Store</span>
      </span>
    </span>
  );
}

export function GooglePlayBadge(): JSX.Element {
  return (
    <span
      className="inline-flex h-12 items-center gap-2.5 rounded-lg bg-warm-900 px-4 text-ink-inverse transition-colors hover:bg-warm-800"
      role="img"
      aria-label="Get it on Google Play"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden>
        <path d="M3.5 1.5v21l11-10.5-11-10.5z" fill="#4DB6AC" />
        <path d="M3.5 1.5L19 12 3.5 22.5l-.5-.5V2L3.5 1.5z" fill="#FFC107" opacity="0.85" />
        <path d="M3.5 1.5L14.5 12 3 22 3.5 1.5z" fill="#FF7043" opacity="0.85" />
        <path d="M3.5 22.5L14.5 12 19 16l-15.5 6.5z" fill="#42A5F5" opacity="0.85" />
      </svg>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-normal opacity-80">GET IT ON</span>
        <span className="text-base font-semibold">Google Play</span>
      </span>
    </span>
  );
}
