import { describe, expect, it } from 'vitest';

import type { GeoSample } from '@petwalker/shared';

import { WalksService } from './walks.service.js';

/**
 * appendSamples is the only piece with non-trivial logic worth testing.
 * The DB layer is stubbed via a tiny in-memory fake — same shape as Drizzle's
 * .select().from(...).where(...) and .update(...).set(...).where(...) chains.
 */

interface WalkRow {
  id: string;
  bookingId: string;
  polyline: GeoSample[];
}

function fakeDb(initial: WalkRow[]) {
  const rows = initial.slice();
  // The service only uses .select().from(walks).where(eq(walks.id, x)) and
  // .update(walks).set({ polyline }).where(eq(walks.id, x)). We don't try to
  // mimic Drizzle's full surface — just the chain shapes the service uses.
  return {
    rows,
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(rows.map((r) => ({ ...r }))),
      }),
    }),
    update: () => ({
      set: (patch: { polyline: GeoSample[] }) => ({
        where: () => {
          rows[0]!.polyline = patch.polyline;
          return Promise.resolve();
        },
      }),
    }),
  };
}

function makeService(db: ReturnType<typeof fakeDb>): WalksService {
  // Bypass Nest DI — instantiate directly with the fake.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new WalksService(db as any);
}

const baseSample = (t: number, lat = 40.7, lng = -74): GeoSample => ({ lat, lng, t });

describe('WalksService.appendSamples', () => {
  it('inserts new samples and sorts by t', async () => {
    const db = fakeDb([{ id: 'w1', bookingId: 'b1', polyline: [] }]);
    const svc = makeService(db);
    await svc.appendSamples('w1', [baseSample(2000), baseSample(1000), baseSample(3000)]);
    expect(db.rows[0]!.polyline.map((s) => s.t)).toEqual([1000, 2000, 3000]);
  });

  it('drops duplicates by timestamp', async () => {
    const db = fakeDb([
      { id: 'w1', bookingId: 'b1', polyline: [baseSample(1000), baseSample(2000)] },
    ]);
    const svc = makeService(db);
    await svc.appendSamples('w1', [baseSample(2000, 41, -73), baseSample(3000)]);
    expect(db.rows[0]!.polyline.map((s) => s.t)).toEqual([1000, 2000, 3000]);
    // First write wins for a duplicate t — original lat/lng preserved.
    expect(db.rows[0]!.polyline.find((s) => s.t === 2000)?.lat).toBe(40.7);
  });

  it('is a no-op when the batch is empty', async () => {
    const db = fakeDb([{ id: 'w1', bookingId: 'b1', polyline: [baseSample(1000)] }]);
    const svc = makeService(db);
    await svc.appendSamples('w1', []);
    expect(db.rows[0]!.polyline.map((s) => s.t)).toEqual([1000]);
  });

  it('is a no-op when every sample is already present', async () => {
    const db = fakeDb([
      {
        id: 'w1',
        bookingId: 'b1',
        polyline: [baseSample(1000), baseSample(2000), baseSample(3000)],
      },
    ]);
    const svc = makeService(db);
    await svc.appendSamples('w1', [baseSample(2000), baseSample(3000)]);
    expect(db.rows[0]!.polyline).toHaveLength(3);
  });
});
