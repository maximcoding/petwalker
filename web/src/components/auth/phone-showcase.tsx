import Image from 'next/image';
import type { JSX } from 'react';

/**
 * PhoneShowcase — phone mockup centred among real dog photos.
 *
 * The phone screen content shows a dog-walker on grass with a dog
 * mid-jump (per product brief, May 2026). Until a real cutout exists
 * under `public/images/auth/`, we fall back to a placedog.net photo
 * at the same path — drop the real file with these exact names to
 * take over from the fallback:
 *
 *   /images/auth/dog-walker-grass.jpg  — phone screen content
 *   /images/auth/dog-pedicure.jpg      — bottom-left decorative orb
 *
 * Other decorative orbs continue to use placedog.net random photos.
 * Host is allow-listed in `web/next.config.mjs` (placedog.net entry).
 */
// Local paths — drop the real cutouts here to take over from
// placedog.net fallbacks.
const WALKER_PHOTO = '/images/auth/dog-walker-grass.jpg';
const PEDICURE_PHOTO = '/images/auth/dog-pedicure.jpg';
// Fallback URLs when the local file is missing (Next/Image will 404
// on a missing local file, so we ship a placedog stand-in by default
// and the user swaps to local once the cutout exists).
const WALKER_FALLBACK = 'https://placedog.net/600/900?id=42';
const PEDICURE_FALLBACK = 'https://placedog.net/280/280?id=77';
// Toggle these to `true` once the real files are in `web/public/images/auth/`.
const USE_LOCAL_WALKER = false;
const USE_LOCAL_PEDICURE = false;
export function PhoneShowcase(): JSX.Element {
  return (
    <div
      className="relative mx-auto h-[460px] w-[330px] sm:h-[520px] sm:w-[370px]"
      aria-hidden
    >
      {/* ── Decorative dog-photo orbs around the phone ───────────── */}

      {/* Top-left polaroid — slightly rotated */}
      <div
        className="absolute -start-16 top-2 z-modal h-32 w-32 overflow-hidden rounded-2xl shadow-overlay ring-4 ring-ink-inverse sm:h-36 sm:w-36"
        style={{ transform: 'rotate(-8deg)' }}
      >
        <Image
          src="https://placedog.net/240/240?id=58"
          alt="Happy dog"
          width={160}
          height={160}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      {/* Top-right circular */}
      <div
        className="absolute -end-14 top-14 z-modal h-28 w-28 overflow-hidden rounded-full shadow-overlay ring-4 ring-ink-inverse sm:h-32 sm:w-32"
        style={{ transform: 'rotate(6deg)' }}
      >
        <Image
          src="https://placedog.net/240/240?id=12"
          alt="Sitter pup"
          width={160}
          height={160}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      {/* Bottom-left circular, larger — DOG PEDICURE photo (per brief).
          Falls back to placedog.net until /images/auth/dog-pedicure.jpg
          is dropped on disk. */}
      <div
        className="absolute -start-20 bottom-10 z-modal h-36 w-36 overflow-hidden rounded-full shadow-overlay ring-4 ring-ink-inverse sm:h-40 sm:w-40"
        style={{ transform: 'rotate(-4deg)' }}
      >
        <Image
          src={USE_LOCAL_PEDICURE ? PEDICURE_PHOTO : PEDICURE_FALLBACK}
          alt="Dog pedicure"
          width={180}
          height={180}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      {/* Bottom-right polaroid */}
      <div
        className="absolute -end-16 bottom-4 z-modal h-32 w-32 overflow-hidden rounded-2xl shadow-overlay ring-4 ring-ink-inverse sm:h-36 sm:w-36"
        style={{ transform: 'rotate(8deg)' }}
      >
        <Image
          src="https://placedog.net/240/240?id=33"
          alt="Loyal companion"
          width={160}
          height={160}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      {/* ── Phone bezel + screen ─────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 z-elevated mx-auto h-[420px] w-[230px] overflow-hidden rounded-[2.25rem] border-[8px] border-warm-900 bg-ink-inverse shadow-overlay sm:h-[480px] sm:w-[260px]">
        {/* Notch */}
        <div
          aria-hidden
          className="absolute start-1/2 top-0 h-5 w-20 -translate-x-1/2 rounded-b-2xl bg-warm-900"
        />

        {/* Screen content — dog walker on grass with a dog
            mid-jump. We deliberately don't render a fake app UI
            here because the real app may not look anything like a
            mocked one. A single hero photo reads as "petwalker
            connects you with walkers" without faking UI. Falls
            back to placedog.net until the real cutout is dropped
            at /images/auth/dog-walker-grass.jpg. */}
        <div className="relative h-full w-full bg-warm-100">
          <Image
            src={USE_LOCAL_WALKER ? WALKER_PHOTO : WALKER_FALLBACK}
            alt=""
            width={600}
            height={900}
            className="h-full w-full object-cover"
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
