import { describe, expect, it } from 'vitest';

import { decodeCursor } from './cursor.js';
import { buildCursorPage } from './pagination.js';

interface Row {
  id: string;
  v: number;
}

const mapItem = (r: Row): { id: string; v: number } => ({ id: r.id, v: r.v });
const buildCursor = (r: Row): { id: string } => ({ id: r.id });

describe('buildCursorPage', () => {
  it('empty → no items, null cursor', () => {
    const page = buildCursorPage<Row, ReturnType<typeof mapItem>>([], 10, mapItem, buildCursor);
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it('rows < limit → returns all, null cursor', () => {
    const rows: Row[] = [{ id: 'a', v: 1 }, { id: 'b', v: 2 }];
    const page = buildCursorPage(rows, 10, mapItem, buildCursor);
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it('rows == limit (no over-fetch) → null cursor', () => {
    const rows: Row[] = [{ id: 'a', v: 1 }, { id: 'b', v: 2 }];
    const page = buildCursorPage(rows, 2, mapItem, buildCursor);
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it('rows == limit + 1 → drops last from items, builds cursor from new last', () => {
    const rows: Row[] = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'c', v: 3 }, // over-fetched, dropped
    ];
    const page = buildCursorPage(rows, 2, mapItem, buildCursor);
    expect(page.items).toEqual([{ id: 'a', v: 1 }, { id: 'b', v: 2 }]);
    expect(page.nextCursor).not.toBeNull();
    expect(decodeCursor(page.nextCursor!)).toEqual({ id: 'b' });
  });
});
