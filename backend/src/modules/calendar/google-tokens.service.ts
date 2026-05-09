import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  googleOauthTokens,
  type GoogleOauthTokenRow,
} from '../../db/schema/index.js';

import { GoogleOauthService } from './google-oauth.service.js';

/**
 * Refresh slightly before the access token actually expires so we don't
 * race a 60-second-old token against a freebusy.query call.
 */
const REFRESH_BUFFER_MS = 60_000;

/**
 * Owns the `google_oauth_tokens` row for each user.
 *
 * The two interesting methods are:
 *
 *   • `upsertFromExchange()` — called once after the user comes back
 *     from Google's consent screen. Stores tokens; if Google didn't
 *     issue a fresh refresh_token (which it won't unless `prompt=consent`
 *     was set), we keep whatever refresh token we already had.
 *
 *   • `getValidAccessToken()` — the workhorse. Looks up the row,
 *     refreshes the access token if it's about to expire, persists
 *     the new value, and hands the caller a token they can use right
 *     now. Calendar sync calls this every 30 minutes per user.
 *
 * Refresh failures with `invalid_grant` mean the refresh token was
 * revoked (user disconnected the app from their Google account, or
 * changed password). We surface that as `RefreshTokenRevokedError` so
 * the caller can drop the row and prompt re-consent.
 */
@Injectable()
export class GoogleTokensService {
  private readonly log = new Logger(GoogleTokensService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @Inject(GoogleOauthService) private readonly oauth: GoogleOauthService,
  ) {}

  async getByUserId(userId: string): Promise<GoogleOauthTokenRow | null> {
    const [row] = await this.db
      .select()
      .from(googleOauthTokens)
      .where(eq(googleOauthTokens.userId, userId));
    return row ?? null;
  }

  /**
   * Persist tokens just exchanged from Google's authorization-code grant.
   * Refresh token is preserved across re-consents — Google doesn't
   * always issue a new one even when `prompt=consent` is set.
   */
  async upsertFromExchange(
    userId: string,
    googleEmail: string,
    accessToken: string,
    refreshTokenFromExchange: string | undefined,
    expiresInSeconds: number,
    scope: string,
  ): Promise<GoogleOauthTokenRow> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const existing = await this.getByUserId(userId);
    const refreshToken = refreshTokenFromExchange ?? existing?.refreshToken;
    if (!refreshToken) {
      throw new Error(
        'Google did not return a refresh_token and we have none stored — ' +
          're-run consent with prompt=consent + access_type=offline.',
      );
    }
    const [row] = await this.db
      .insert(googleOauthTokens)
      .values({
        userId,
        googleEmail,
        accessToken,
        refreshToken,
        expiresAt,
        scope,
      })
      .onConflictDoUpdate({
        target: googleOauthTokens.userId,
        set: {
          googleEmail,
          accessToken,
          refreshToken,
          expiresAt,
          scope,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    if (!row) throw new Error('upsert returned no row');
    return row;
  }

  /**
   * Returns a usable access token, refreshing it transparently if the
   * stored one has (almost) expired. Throws `RefreshTokenRevokedError`
   * if Google says the refresh token is no longer valid — in which
   * case the caller should treat the row as disconnected.
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const row = await this.getByUserId(userId);
    if (!row) throw new NotFoundException('Google account not connected');

    if (row.expiresAt.getTime() - REFRESH_BUFFER_MS > Date.now()) {
      return row.accessToken;
    }

    try {
      const refreshed = await this.oauth.refreshAccessToken(row.refreshToken);
      const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
      await this.db
        .update(googleOauthTokens)
        .set({
          accessToken: refreshed.accessToken,
          expiresAt,
          // Google may grant an updated scope set on refresh — record it
          // so a later "did the user revoke?" check stays accurate.
          scope: refreshed.scope ?? row.scope,
          updatedAt: sql`now()`,
        })
        .where(eq(googleOauthTokens.userId, userId));
      return refreshed.accessToken;
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('invalid_grant')) {
        // Refresh token was revoked. Surface a typed error so the
        // controller can wipe the row and ask the user to re-connect.
        throw new RefreshTokenRevokedError(userId, msg);
      }
      this.log.warn(`refresh failed for user ${userId}: ${msg}`);
      throw err;
    }
  }

  /** Drop the row entirely — used by the disconnect endpoint. */
  async delete(userId: string): Promise<void> {
    await this.db.delete(googleOauthTokens).where(eq(googleOauthTokens.userId, userId));
  }

  /** All connected users — for the periodic sync sweep. */
  async listConnectedUserIds(): Promise<string[]> {
    const rows = await this.db
      .select({ userId: googleOauthTokens.userId })
      .from(googleOauthTokens);
    return rows.map((r) => r.userId);
  }
}

/**
 * Thrown when Google reports `invalid_grant` on refresh — the user
 * has revoked our access (manually unlinking us in their Google
 * account, changing their password, etc.) and we need to ask them to
 * reconnect.
 */
export class RefreshTokenRevokedError extends Error {
  readonly userId: string;
  constructor(userId: string, original: string) {
    super(`Google refresh token revoked (user ${userId}): ${original}`);
    this.name = 'RefreshTokenRevokedError';
    this.userId = userId;
  }
}
