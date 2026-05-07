/**
 * Deterministic placeholder image URLs for empty avatar/photo slots.
 *
 * Both services serve image bytes directly (no JSON), so they slot straight
 * into <img src> / Next/Image without extra plumbing.
 *
 *   provider avatars → https://i.pravatar.cc/256?u=<seed>
 *   pet photos       → https://placedog.net/400/400?id=<1..180>
 *
 * Using deterministic seeds means the same record always shows the same
 * placeholder, so reloads aren't jarring.
 */

export function placeholderAvatarUrl(seed: string): string {
  return `https://i.pravatar.cc/256?u=${encodeURIComponent(seed)}`;
}

export function placeholderDogPhotoUrl(seed: string): string {
  // Stable hash → 1..180 dog id range that placedog.net actually serves.
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const id = (h % 180) + 1;
  return `https://placedog.net/400/400?id=${id}`;
}
