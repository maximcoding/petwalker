import Image from 'next/image';
import type { CSSProperties, JSX } from 'react';

/**
 * DogMascot — playful peek-around-the-corner dogs for the auth shell.
 *
 *   • `curlers`     → custom SVG long-haired dachshund close-up with
 *                     three pink hair curlers on top. Pure vector,
 *                     no background → blends with any gradient.
 *   • `sunglasses`  → real placedog.net photo with cartoon human-eye
 *                     and tinted sunglasses overlay, same dog ID as
 *                     the centre of the phone showcase.
 *
 * The custom-SVG variant exists because no free photo service offers
 * cutout dachshunds with curlers. When the user opts into paid AI
 * generation later, the curlers variant can swap to a generated PNG.
 */
export interface DogMascotProps {
  variant: 'curlers' | 'sunglasses';
  /** Photo id passed to placedog.net (sunglasses variant only). */
  photoId?: number;
  /**
   * Real custom photo path (e.g. `/images/auth/dachshund-curlers.jpg`).
   * When supplied, replaces the SVG fallback. Drop a photo into
   * `web/public/images/auth/` and pass the path here.
   */
  src?: string;
  /** Diameter / width hint in pixels. */
  size?: number;
  /** When `src` is set, drop the frame (no ring, no shadow). Good
   *  for transparent-PNG cutouts. */
  frameless?: boolean;
  /** Apply a radial-gradient mask that soft-fades the rectangular
   * photo edges into transparency. Use for JPG photos with a uniform
   * background so they dissolve into the page. Skip for true cutout
   * PNGs (the alpha channel already handles it). */
  maskEdges?: boolean;
  className?: string;
}

export function DogMascot({
  variant,
  photoId,
  src,
  size = 160,
  frameless = false,
  maskEdges = false,
  className = '',
}: DogMascotProps): JSX.Element {
  // Real custom image takes priority over any fallback.
  if (src) {
    return (
      <CustomPhoto
        src={src}
        size={size}
        className={className}
        frameless={frameless}
        maskEdges={maskEdges}
      />
    );
  }
  if (variant === 'curlers') {
    return <DachshundInCurlers size={size} className={className} />;
  }
  return <SunglassesDog size={size} photoId={photoId ?? 22} className={className} />;
}

/**
 * CustomPhoto — renders an arbitrary photo the user dropped into
 * `web/public/images/auth/`. Wrapped in a rounded-2xl frame with a
 * soft warm shadow + thin ink-inverse ring, suited for a portrait
 * or wide pet-photo crop. If you supply a transparent-PNG cutout,
 * the frame still works around the alpha — set `frameless` if you
 * want the cutout to render with zero chrome (no ring, no shadow).
 */
function CustomPhoto({
  src,
  size,
  className,
  frameless = false,
  maskEdges = false,
}: {
  src: string;
  size: number;
  className: string;
  frameless?: boolean;
  maskEdges?: boolean;
}): JSX.Element {
  if (frameless) {
    // Tight radial-gradient mask hugs the central subject (~50% of
    // canvas) and falls off fast to transparency by ~75% radius.
    // Effectively cuts away the rectangular peach wash without a
    // true alpha channel. Only applied when `maskEdges` is set —
    // a real transparent-PNG cutout doesn't need it.
    const maskStyle: CSSProperties = maskEdges
      ? {
          width: size,
          height: 'auto',
          WebkitMaskImage:
            'radial-gradient(ellipse 65% 70% at 50% 50%, rgba(0,0,0,1) 70%, rgba(0,0,0,0.6) 88%, rgba(0,0,0,0) 100%)',
          maskImage:
            'radial-gradient(ellipse 65% 70% at 50% 50%, rgba(0,0,0,1) 70%, rgba(0,0,0,0.6) 88%, rgba(0,0,0,0) 100%)',
        }
      : { width: size, height: 'auto' };
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={className}
        style={maskStyle}
        unoptimized
      />
    );
  }
  return (
    <div
      className={`overflow-hidden rounded-2xl shadow-overlay ring-4 ring-ink-inverse ${className}`}
      style={{ width: size, height: 'auto' }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="h-auto w-full"
        unoptimized
      />
    </div>
  );
}

/* ------------------------------------------------------------------
 * Long-haired dachshund in curlers — pure SVG cutout.
 * ------------------------------------------------------------------ */
function DachshundInCurlers({
  size,
  className,
}: {
  size: number;
  className: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 220 240"
      className={className}
      style={{ width: size, height: size * (240 / 220) }}
      aria-hidden
    >
      {/* Defs — fur gradient for depth */}
      <defs>
        <radialGradient id="fur" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#a14620" />
          <stop offset="60%" stopColor="#743317" />
          <stop offset="100%" stopColor="#4d220f" />
        </radialGradient>
        <radialGradient id="muzzle" cx="50%" cy="60%" r="70%">
          <stop offset="0%" stopColor="#a14620" />
          <stop offset="100%" stopColor="#4d220f" />
        </radialGradient>
      </defs>

      {/* ────── EARS (long, droopy, behind head) ────── */}
      {/* Left ear — long flowing flap */}
      <path
        d="M 50 110 C 24 130 14 170 22 210 C 28 232 56 238 68 212 C 78 188 76 150 70 124 Z"
        fill="#4d220f"
      />
      <path
        d="M 56 114 C 36 130 28 162 36 198 C 42 220 60 224 66 206 C 72 184 70 148 68 126 Z"
        fill="#743317"
      />
      {/* Ear strands (long-hair detail) */}
      <path
        d="M 38 200 C 30 220 26 232 36 234"
        stroke="#4d220f"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 50 210 C 46 226 44 232 52 234"
        stroke="#4d220f"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Right ear */}
      <path
        d="M 170 110 C 196 130 206 170 198 210 C 192 232 164 238 152 212 C 142 188 144 150 150 124 Z"
        fill="#4d220f"
      />
      <path
        d="M 164 114 C 184 130 192 162 184 198 C 178 220 160 224 154 206 C 148 184 150 148 152 126 Z"
        fill="#743317"
      />
      <path
        d="M 182 200 C 190 220 194 232 184 234"
        stroke="#4d220f"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 170 210 C 174 226 176 232 168 234"
        stroke="#4d220f"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* ────── HEAD ────── */}
      {/* Cranium */}
      <ellipse cx="110" cy="120" rx="68" ry="58" fill="url(#fur)" />
      {/* Forehead highlight (silky long-hair) */}
      <ellipse cx="110" cy="105" rx="50" ry="32" fill="#a14620" opacity="0.6" />
      {/* Cheek tufts (long hair feathers down) */}
      <path
        d="M 52 160 C 46 200 50 222 64 226 C 74 222 78 200 70 168 Z"
        fill="#743317"
      />
      <path
        d="M 168 160 C 174 200 170 222 156 226 C 146 222 142 200 150 168 Z"
        fill="#743317"
      />
      {/* Hair partings — give long-hair texture */}
      <path
        d="M 86 100 Q 92 132 96 168"
        stroke="#4d220f"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M 134 100 Q 128 132 124 168"
        stroke="#4d220f"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M 110 92 L 110 174"
        stroke="#4d220f"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* ────── MUZZLE (long, pointed — dachshund signature) ────── */}
      <ellipse cx="110" cy="180" rx="34" ry="42" fill="url(#muzzle)" />
      {/* Muzzle highlight */}
      <ellipse cx="110" cy="190" rx="26" ry="32" fill="#a14620" opacity="0.4" />

      {/* ────── EYES (soft, sad-eyed dachshund) ────── */}
      <ellipse cx="86" cy="140" rx="10" ry="13" fill="#2a2522" />
      <ellipse cx="134" cy="140" rx="10" ry="13" fill="#2a2522" />
      {/* Eye whites underneath (puppy-dog eyes) */}
      <ellipse cx="86" cy="148" rx="6" ry="4" fill="#ffffff" opacity="0.35" />
      <ellipse cx="134" cy="148" rx="6" ry="4" fill="#ffffff" opacity="0.35" />
      {/* Sparkles */}
      <circle cx="89" cy="135" r="2.6" fill="#ffffff" />
      <circle cx="137" cy="135" r="2.6" fill="#ffffff" />
      {/* Eyebrow tufts */}
      <path
        d="M 74 124 Q 84 118 96 124"
        stroke="#4d220f"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 124 124 Q 134 118 146 124"
        stroke="#4d220f"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* ────── NOSE ────── */}
      <ellipse cx="110" cy="170" rx="11" ry="9" fill="#2a2522" />
      <ellipse cx="106" cy="167" rx="3" ry="2" fill="#ffffff" opacity="0.6" />

      {/* ────── MOUTH ────── */}
      <path
        d="M 110 184 L 110 198"
        stroke="#2a2522"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 110 198 Q 96 208 88 202"
        stroke="#2a2522"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 110 198 Q 124 208 132 202"
        stroke="#2a2522"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Tongue */}
      <path
        d="M 104 200 Q 110 212 116 200 Q 113 208 110 208 Q 107 208 104 200 Z"
        fill="#ff6b6b"
      />

      {/* ────── CURLERS (3 cylinders on top of head) ────── */}
      <g transform="translate(56 38) rotate(-12)">
        <rect x="0" y="0" width="26" height="42" rx="13" fill="#ff8770" stroke="#c43d3d" strokeWidth="2" />
        <rect x="3" y="3" width="20" height="36" rx="10" fill="#ffceaa" />
        <line x1="7" y1="8" x2="7" y2="34" stroke="#c43d3d" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="13" y1="8" x2="13" y2="34" stroke="#c43d3d" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="19" y1="8" x2="19" y2="34" stroke="#c43d3d" strokeWidth="1.2" strokeLinecap="round" />
        {/* Hair sprout poking through */}
        <path d="M 6 -6 Q 13 -14 20 -6" stroke="#4d220f" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      <g transform="translate(94 24) rotate(2)">
        <rect x="0" y="0" width="30" height="46" rx="15" fill="#ed5151" stroke="#9b2e2e" strokeWidth="2" />
        <rect x="3" y="3" width="24" height="40" rx="12" fill="#ffa190" />
        <line x1="8" y1="8" x2="8" y2="38" stroke="#9b2e2e" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="15" y1="8" x2="15" y2="38" stroke="#9b2e2e" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="22" y1="8" x2="22" y2="38" stroke="#9b2e2e" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 6 -8 Q 15 -16 24 -8" stroke="#4d220f" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      <g transform="translate(138 38) rotate(14)">
        <rect x="0" y="0" width="26" height="42" rx="13" fill="#ff8770" stroke="#c43d3d" strokeWidth="2" />
        <rect x="3" y="3" width="20" height="36" rx="10" fill="#ffceaa" />
        <line x1="7" y1="8" x2="7" y2="34" stroke="#c43d3d" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="13" y1="8" x2="13" y2="34" stroke="#c43d3d" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="19" y1="8" x2="19" y2="34" stroke="#c43d3d" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 6 -6 Q 13 -14 20 -6" stroke="#4d220f" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------
 * Sunglasses dog — placedog photo with overlays.
 * ------------------------------------------------------------------ */
function SunglassesDog({
  size,
  photoId,
  className,
}: {
  size: number;
  photoId: number;
  className: string;
}): JSX.Element {
  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-full shadow-overlay ring-4 ring-ink-inverse">
        <Image
          src={`https://placedog.net/${size * 2}/${size * 2}?id=${photoId}`}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      {/* Cartoon human-style eyes */}
      <svg
        viewBox="0 0 100 30"
        className="absolute start-1/2 h-auto -translate-x-1/2"
        style={{ top: `${size * 0.5}px`, width: size * 0.75 }}
        aria-hidden
      >
        <ellipse cx="28" cy="15" rx="14" ry="10" fill="#ffffff" stroke="#2a2522" strokeWidth="2.5" />
        <ellipse cx="72" cy="15" rx="14" ry="10" fill="#ffffff" stroke="#2a2522" strokeWidth="2.5" />
        <circle cx="28" cy="16" r="6" fill="#5b6dff" />
        <circle cx="72" cy="16" r="6" fill="#5b6dff" />
        <circle cx="28" cy="16" r="3" fill="#2a2522" />
        <circle cx="72" cy="16" r="3" fill="#2a2522" />
        <circle cx="30" cy="14" r="1.5" fill="#ffffff" />
        <circle cx="74" cy="14" r="1.5" fill="#ffffff" />
      </svg>

      {/* Sunglasses pushed up on the head */}
      <svg
        viewBox="0 0 120 40"
        className="absolute start-1/2 h-auto -translate-x-1/2"
        style={{ top: `${size * 0.15}px`, width: size * 0.85 }}
        aria-hidden
      >
        <line x1="6" y1="20" x2="20" y2="14" stroke="#2a2522" strokeWidth="3" strokeLinecap="round" />
        <line x1="114" y1="20" x2="100" y2="14" stroke="#2a2522" strokeWidth="3" strokeLinecap="round" />
        <rect x="18" y="6" width="36" height="22" rx="11" fill="#2a2522" stroke="#2a2522" strokeWidth="2" />
        <path d="M 22 10 L 28 10 L 22 18 Z" fill="#ffffff" opacity="0.35" />
        <line x1="54" y1="14" x2="66" y2="14" stroke="#2a2522" strokeWidth="3" strokeLinecap="round" />
        <rect x="66" y="6" width="36" height="22" rx="11" fill="#2a2522" stroke="#2a2522" strokeWidth="2" />
        <path d="M 70 10 L 76 10 L 70 18 Z" fill="#ffffff" opacity="0.35" />
      </svg>
    </div>
  );
}
