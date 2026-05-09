import { createHash } from 'node:crypto';

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
  googleOauthTokens,
} from '../../db/schema/index.js';

import { GoogleCalendarService } from './google-calendar.service.js';
import {
  GoogleTokensService,
  RefreshTokenRevokedError,
} from './google-tokens.service.js';

/** Sync horizon — events further out aren't bookable yet, so don't store them. */
const SYNC_HORIZON_DAYS = 60;

/** How often the background sync runs. */
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

export interface SyncResult {
  eventCount: number;
  syncedAt: Date;
}

/**
 * Replays a connected user's Google Calendar busy windows into our
 * `external_busy_blocks` table so the booking-availability check can
 * include them.
 *
 * The on-disk shape (and the `external_busy_blocks` schema) is
 * unchanged from the v1 iCal implementation — only the upstream source
 * moved from "fetch + parse iCal" to "Google freebusy.query". This
 * means the downstream availability checker (`hasExternalConflict`)
 * keeps working with no edits.
 *
 * `externalId` is now a deterministic hash of `start|end` since
 * freebusy returns anonymous busy windows (no event UIDs). The
 * (provider_id, source, external_id) unique index still gives us
 * idempotent insertion if we ever switch from delete-and-insert to
 * incremental sync.
 */
@Injectable()
export class CalendarSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(CalendarSyncService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @Inject(GoogleTokensService) private readonly tokens: GoogleTokensService,
    @Inject(GoogleCalendarService) private readonly google: GoogleCalendarService,
  ) {}

  // ---- lifecycle ----------------------------------------------------------

  onModuleInit(): void {
    // First sweep ~60s after boot so the app finishes coming up; then
    // every SYNC_INTERVAL_MS.
    this.timer = setInterval(() => {
      void this.syncAllConnected();
    }, SYNC_INTERVAL_MS);
    setTimeout(() => void this.syncAllConnected(), 60_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // ---- sync ---------------------------------------------------------------

  /** Sync one user by id. Used by the manual "Sync now" button. */
  async syncOne(userId: string): Promise<SyncResult> {
    const row = await this.tokens.getByUserId(userId);
    if (!row) throw new NotFoundException('Google account not connected');
    return this.runSync(userId);
  }

  /** Background sweep — sync every connected user. */
  async syncAllConnected(): Promise<void> {
    const userIds = await this.tokens.listConnectedUserIds();
    this.log.log(`syncAllConnected: ${userIds.length} user(s)`);
    for (const userId of userIds) {
      try {
        await this.runSync(userId);
      } catch (err) {
        // Already logged inside runSync — keep iterating so one bad
        // account doesn't poison the rest.
        this.log.warn(`user ${userId}: ${(err as Error).message}`);
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

  private async runSync(userId: string): Promise<SyncResult> {
    const now = new Date();
    const horizonEnd = new Date(now.getTime() + SYNC_HORIZON_DAYS * 24 * 60 * 60 * 1000);

    let busyWindows: Array<{ start: Date; end: Date }> = [];
    try {
      const accessToken = await this.tokens.getValidAccessToken(userId);
      busyWindows = await this.google.getBusyWindows(accessToken, now, horizonEnd);
    } catch (err) {
      if (err instanceof RefreshTokenRevokedError) {
        // User unlinked us in Google. Wipe the tokens so the UI shows
        // "not connected" and prompts re-consent. Keep historical busy
        // blocks — they'll age out as the next successful sync replaces
        // them, or a manual disconnect clears them.
        await this.tokens.delete(userId);
        await this.db
          .delete(externalBusyBlocks)
          .where(eq(externalBusyBlocks.providerId, userId));
        this.log.warn(`user ${userId}: refresh token revoked, disconnected`);
        throw err;
      }
      throw err;
    }

    const syncedAt = new Date();

    // Replace-all strategy. freebusy returns coalesced busy windows so
    // there's no incremental id to diff against; the cheapest correct
    // path is to wipe + re-insert.
    await this.db.transaction(async (tx) => {
      await tx.delete(externalBusyBlocks).where(eq(externalBusyBlocks.providerId, userId));
      if (busyWindows.length > 0) {
        await tx.insert(externalBusyBlocks).values(
          busyWindows.map((b) => ({
            providerId: userId,
            source: 'google' as const,
            // Stable hash so repeated syncs of the same window collide
            // on the unique index (defense in depth — replace-all means
            // we shouldn't see a collision in practice).
            externalId: hashWindow(b.start, b.end),
            startTs: b.start,
            endTs: b.end,
            summary: null,
          })),
        );
      }
      // Bump the token row's updated_at so the UI's "last synced" reads
      // accurately — we don't keep a separate sync-status table for
      // Google like we did for iCal.
      await tx
        .update(googleOauthTokens)
        .set({ updatedAt: syncedAt })
        .where(eq(googleOauthTokens.userId, userId));
    });

    this.log.log(`user ${userId} synced: ${busyWindows.length} busy windows`);
    return { eventCount: busyWindows.length, syncedAt };
  }
}

function hashWindow(start: Date, end: Date): string {
  return createHash('sha1')
    .update(`${start.toISOString()}|${end.toISOString()}`)
    .digest('hex');
}
