import type { QueryClient } from '@tanstack/react-query';

import type {
  CursorPage,
  ServiceProviderDetail,
  ServiceProviderListing,
} from '@petwalker/shared/types';

/**
 * Walk every cached query whose data shape includes a provider with the
 * given id and flip its `isFavorited` to `next`.
 *
 * Covers three shapes we render:
 *   1. Infinite-query pages of `CursorPage<ServiceProviderListing>` (the
 *      /providers search and /me/favorites listings) — `data.pages[].items`.
 *   2. Single-page `CursorPage<ServiceProviderListing>` (any non-infinite
 *      use of the same endpoint) — `data.items`.
 *   3. Single `ServiceProviderDetail` from `/providers/:id`.
 *
 * Using `setQueriesData` with `queryKey: []` matches every cache entry.
 * The updater is a no-op for entries that don't carry the provider, so the
 * cost is just an O(items) scan over what's already in memory.
 */
export function toggleFavoriteInQueries(
  qc: QueryClient,
  providerId: string,
  next: boolean,
): void {
  qc.setQueriesData<unknown>({ queryKey: [] }, (data) => {
    if (data == null) return data;
    return updateData(data, providerId, next);
  });
}

function updateData(data: unknown, providerId: string, next: boolean): unknown {
  // 1. Infinite query — { pages: [...], pageParams: [...] }
  if (isInfiniteData(data)) {
    return {
      ...data,
      pages: data.pages.map((page) => updatePage(page, providerId, next)),
    };
  }
  // 2. Single CursorPage — { items: [...], nextCursor: ... }
  if (isCursorPage(data)) {
    return updatePage(data, providerId, next);
  }
  // 3. Detail object — { userId, ..., isFavorited }
  if (isDetail(data) && data.userId === providerId) {
    return { ...data, isFavorited: next };
  }
  return data;
}

function updatePage(
  page: CursorPage<ServiceProviderListing>,
  providerId: string,
  next: boolean,
): CursorPage<ServiceProviderListing> {
  let touched = false;
  const items = page.items.map((item) => {
    if (item.userId !== providerId) return item;
    touched = true;
    return { ...item, isFavorited: next };
  });
  return touched ? { ...page, items } : page;
}

interface InfiniteData<T> {
  pages: T[];
  pageParams: unknown[];
}

function isInfiniteData(
  v: unknown,
): v is InfiniteData<CursorPage<ServiceProviderListing>> {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as { pages?: unknown };
  return Array.isArray(o.pages) && o.pages.every(isCursorPage);
}

function isCursorPage(v: unknown): v is CursorPage<ServiceProviderListing> {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as { items?: unknown; nextCursor?: unknown };
  if (!Array.isArray(o.items)) return false;
  if (!('nextCursor' in o)) return false;
  // Only treat as a listing page if the items look like provider listings.
  // Empty pages match harmlessly — the updater will be a no-op.
  if (o.items.length === 0) return true;
  const first = o.items[0] as { userId?: unknown; offerings?: unknown };
  return typeof first?.userId === 'string' && Array.isArray(first?.offerings);
}

function isDetail(v: unknown): v is ServiceProviderDetail {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as { userId?: unknown; offerings?: unknown; isFavorited?: unknown };
  return (
    typeof o.userId === 'string' &&
    Array.isArray(o.offerings) &&
    typeof o.isFavorited === 'boolean'
  );
}
