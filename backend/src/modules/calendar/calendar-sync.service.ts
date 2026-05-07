import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  externalBusyBlocks,
  providerCalendarFeeds,
  type ProviderCalendarFeedRow,
} from '../../db/schema/index.js';

import { parseIcal, type IcalEvent } from './ical-parser.js';

/** Sync horizon — events further out aren't bookable yet, so don't store them. */
const SYNC_HORIZON_DAYS = 60;

/** How often the background sync runs. */
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

/** Per-feed fetch timeout — iCal endpoints can be slow. */
const FETCH_TIMEOUT_MS = 15_000;

export interface SyncResult {
  eventCount: number;
  syncedAt: Date;
}

@Injectable()
export class CalendarSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(CalendarSyncService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  // ---- lifecycle ----------------------------------------------------------

  onModuleInit(): void {
    // Don't run on boot — let the app finish coming up first. Schedule the
    // first run a minute out, then every SYNC_INTERVAL_MS.
    this.timer = setInterval(() => {
      void this.syncAllEnabled();
    }, SYNC_INTERVAL_MS);
    setTimeout(() => void this.syncAllEnabled(), 60_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // ---- feed CRUD (called by the controller) -------------------------------

  async getFeed(userId: string): Promise<ProviderCalendarFeedRow | null> {
    const [row] = await this.db
      .select()
      .from(providerCalendarFeeds)
      .where(eq(providerCalendarFeeds.userId, userId));
    return row ?? null;
  }

  async upsertFeed(
    userId: string,
    icalUrl: string,
    enabled: boolean,
  ): Promise<ProviderCalendarFeedRow> {
    const [row] = await this.db
      .insert(providerCalendarFeeds)
      .values({ userId, icalUrl, enabled })
      .onConflictDoUpdate({
        target: providerCalendarFeeds.userId,
        set: {
          icalUrl,
          enabled,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    if (!row) throw new Error('upsert returned no row');
    return row;
  }

  async deleteFeed(userId: string): Promise<void> {
    await this.db.delete(providerCalendarFeeds).where(eq(providerCalendarFeeds.userId, userId));
    // Drop the synced busy blocks too — keeping orphans would silently keep
    // blocking bookings even after the provider disconnects their calendar.
    await this.db.delete(externalBusyBlocks).where(eq(externalBusyBlocks.providerId, userId));
  }

  // ---- sync ---------------------------------------------------------------

  /** Sync one feed by user id. Used by the manual "Test fetch" button. */
  async syncOne(userId: string): Promise<SyncResult> {
    const feed = await this.getFeed(userId);
    if (!feed) throw new NotFoundException('No calendar feed configured');
    return this.runSync(feed);
  }

  /** Background sweep — sync every enabled feed. */
  async syncAllEnabled(): Promise<void> {
    const feeds = await this.db
      .select()
      .from(providerCalendarFeeds)
      .where(eq(providerCalendarFeeds.enabled, true));
    this.log.log(`syncAllEnabled: ${feeds.length} feed(s)`);
    for (const feed of feeds) {
      try {
        await this.runSync(feed);
      } catch (err) {
        // Already logged inside runSync — keep iterating so one bad feed
        // doesn't poison the rest.
        this.log.warn(`feed ${feed.userId}: ${(err as Error).message}`);
      }
    }
  }

  /** Returns `true` if any external busy block intersects [start, end). */
  async hasExternalConflict(providerId: string, start: Date, end: Date): Promise<boolean> {
    // overlap: block.start < end AND block.end > start
    const rows = await this.db
      .select({ ok: sql<number>`1` })
      .from(externalBusyBlocks)
      .where(
        and(
          eq(externalBusyBlocks.providerId, providerId),
          lte(externalBusyBlocks.startTs, end),
          gte(externalBusyBlocks.endTs, start),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  // ---- internal -----------------------------------------------------------

  private async runSync(feed: ProviderCalendarFeedRow): Promise<SyncResult> {
    const horizonEnd = new Date(Date.now() + SYNC_HORIZON_DAYS * 24 * 60 * 60 * 1000);
    let events: IcalEvent[] = [];
    let errorMsg: string | null = null;
    try {
      const text = await this.fetchWithTimeout(feed.icalUrl);
      events = parseIcal(text).filter((e) => e.start.getTime() < horizonEnd.getTime());
    } catch (err) {
      errorMsg = (err as Error).message.slice(0, 500);
    }

    const syncedAt = new Date();

    if (errorMsg) {
      // Mark failure but don't wipe existing blocks — they may still be
      // accurate, just stale.
      await this.db
        .update(providerCalendarFeeds)
        .set({ lastSyncError: errorMsg, lastSyncedAt: syncedAt, updatedAt: syncedAt })
        .where(eq(providerCalendarFeeds.userId, feed.userId));
      this.log.warn(`feed ${feed.userId} fetch failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Replace-all strategy: delete prior blocks for this provider, then
    // insert fresh. Cheap at our scale and avoids drift from RFC 5545
    // edge-cases the parser doesn't yet handle.
    await this.db.transaction(async (tx) => {
      await tx.delete(externalBusyBlocks).where(eq(externalBusyBlocks.providerId, feed.userId));
      if (events.length > 0) {
        await tx.insert(externalBusyBlocks).values(
          events.map((e) => ({
            providerId: feed.userId,
            source: 'ical' as const,
            externalId: e.uid,
            startTs: e.start,
            endTs: e.end,
            summary: e.summary,
          })),
        );
      }
      await tx
        .update(providerCalendarFeeds)
        .set({ lastSyncError: null, lastSyncedAt: syncedAt, updatedAt: syncedAt })
        .where(eq(providerCalendarFeeds.userId, feed.userId));
    });

    this.log.log(`feed ${feed.userId} synced: ${events.length} events`);
    return { eventCount: events.length, syncedAt };
  }

  private async fetchWithTimeout(url: string): Promise<string> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally {
      clearTimeout(t);
    }
  }
}
