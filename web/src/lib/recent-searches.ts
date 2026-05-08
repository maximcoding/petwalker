'use client';

/**
 * Owner's recent free-text searches, kept in localStorage so they survive
 * across reloads but never leave the device. Capped at MAX entries (most
 * recent first) so the chip row never grows unbounded.
 *
 * Storage key is versioned (`:v1`) so we can change the on-disk shape
 * later without leaking malformed entries from older builds.
 */

const KEY = 'petwalker:recent-searches:v1';
const MAX = 8;

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX);
  } catch {
    // Quota errors, parse failures, private-browsing throws, etc. — never
    // block the UI on storage hiccups; just hand back an empty list.
    return [];
  }
}

function write(items: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    // Same defensive posture as `read`. Some browsers throw on quota
    // exceeded; we don't want a one-off failed write to break search.
  }
}

export function loadRecentSearches(): string[] {
  return read();
}

/**
 * Push a query to the front of the recent list. Trims whitespace, ignores
 * empty strings, and de-dupes case-insensitively (so re-typing the same
 * thing doesn't add a near-duplicate row).
 */
export function pushRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return read();
  const lower = trimmed.toLowerCase();
  const next = [trimmed, ...read().filter((q) => q.toLowerCase() !== lower)].slice(0, MAX);
  write(next);
  return next;
}

export function clearRecentSearches(): void {
  write([]);
}
