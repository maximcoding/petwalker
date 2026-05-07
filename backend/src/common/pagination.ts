import { encodeCursor } from './cursor.js';

import type { CursorPage } from '@petwalker/shared/types';

/**
 * Build a CursorPage from an over-fetched array.
 *
 * Convention: the service queries `limit + 1` rows. If we got that many,
 * the last one is dropped from `items` and used to build `nextCursor`.
 *
 *   const rows = await db.select().from(t).limit(query.limit + 1);
 *   return buildCursorPage(rows, query.limit, (r) => ({ t: r.createdAt.toISOString(), id: r.id }));
 */
export function buildCursorPage<TRow, TItem>(
  rows: TRow[],
  limit: number,
  mapItem: (row: TRow) => TItem,
  buildCursor: (row: TRow) => unknown,
): CursorPage<TItem> {
  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;
  const lastVisible = visible[visible.length - 1];
  const nextCursor = hasMore && lastVisible ? encodeCursor(buildCursor(lastVisible)) : null;
  return {
    items: visible.map(mapItem),
    nextCursor,
  };
}
