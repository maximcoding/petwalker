import { randomBytes } from 'node:crypto';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { ENV_TOKEN, type Env } from '../../config/env.js';
import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import { CalendarSyncService } from './calendar-sync.service.js';
import { GoogleOauthService } from './google-oauth.service.js';
import { GoogleTokensService } from './google-tokens.service.js';

/**
 * Endpoints powering the new "Connect Google Calendar" flow.
 *
 * Two surfaces with different auth stories:
 *
 *   /auth/google-calendar/start         (CognitoGuard — frontend fetch)
 *   /auth/google-calendar/callback      (NO guard — top-level redirect from
 *                                        Google. Identity comes from the
 *                                        HMAC-signed state token.)
 *
 *   /me/google-calendar (GET / DELETE)        (CognitoGuard)
 *   /me/google-calendar/sync (POST)           (CognitoGuard)
 *
 * Why /start returns JSON instead of a 302: the frontend fetches with
 * `Authorization: Bearer …`, but a Bearer header isn't sent on a
 * top-level browser redirect. So the frontend gets the URL, then
 * does `window.location = url` itself — the user's subsequent return
 * from Google to /callback hits a public endpoint where authenticity
 * is enforced via the signed state, not Cognito.
 */
@Controller()
export class CalendarController {
  constructor(
    @Inject(CalendarSyncService) private readonly calendar: CalendarSyncService,
    @Inject(GoogleOauthService) private readonly oauth: GoogleOauthService,
    @Inject(GoogleTokensService) private readonly tokens: GoogleTokensService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ENV_TOKEN) private readonly env: Env,
  ) {}

  // ---- OAuth handshake ----------------------------------------------------

  /**
   * Build the Google consent URL for this user. Frontend reads the
   * `url` field and assigns it to `window.location` — we don't 302
   * directly because `fetch` would either swallow the redirect or
   * fail cross-origin.
   */
  @Get('auth/google-calendar/start')
  @UseGuards(CognitoGuard)
  async start(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<{ url: string }> {
    // Resolve the user up front so we can bind the user id (not the
    // Cognito sub) into the state. That way the callback handler
    // doesn't need to re-resolve via auth.upsertUser.
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    const payload = JSON.stringify({
      uid: me.id,
      sub: ctx.sub,
      nonce: randomBytes(12).toString('base64url'),
    });
    const state = this.oauth.signState(Buffer.from(payload).toString('base64url'));
    return { url: this.oauth.buildAuthUrl(state) };
  }

  /**
   * Google's redirect target. Public endpoint — request comes from the
   * user's browser following Google's 302, with no Bearer header. The
   * signed state is what proves the request belongs to the right
   * petwalker user; we wouldn't be able to mint a valid state without
   * the OAuth client secret.
   *
   * Errors are encoded as `?google=error&reason=...` on the return URL
   * so the frontend can render a toast.
   */
  @Get('auth/google-calendar/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') errorParam: string | undefined,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const returnUrl = this.frontendReturnUrl();

    // User clicked Cancel on Google's screen.
    if (errorParam) {
      res.redirect(this.appendQuery(returnUrl, { google: 'cancelled', reason: errorParam }));
      return;
    }
    if (!code || !state) {
      res.redirect(this.appendQuery(returnUrl, { google: 'error', reason: 'missing-code' }));
      return;
    }

    const verifiedPayload = this.oauth.verifyState(state);
    if (!verifiedPayload) {
      res.redirect(this.appendQuery(returnUrl, { google: 'error', reason: 'bad-state' }));
      return;
    }

    let userId: string;
    try {
      const decoded = JSON.parse(
        Buffer.from(verifiedPayload, 'base64url').toString('utf-8'),
      ) as { uid?: string };
      if (!decoded.uid) throw new Error('missing uid');
      userId = decoded.uid;
    } catch {
      res.redirect(this.appendQuery(returnUrl, { google: 'error', reason: 'bad-state' }));
      return;
    }

    try {
      const exchanged = await this.oauth.exchangeCode(code);
      const userInfo = await this.oauth.fetchUserInfo(exchanged.accessToken);
      await this.tokens.upsertFromExchange(
        userId,
        userInfo.email,
        exchanged.accessToken,
        exchanged.refreshToken,
        exchanged.expiresIn,
        exchanged.scope,
      );
      // Kick off an immediate sync so the connected state lands with
      // busy blocks already populated. Failures here are non-fatal —
      // the periodic sweep will catch up.
      void this.calendar.syncOne(userId).catch(() => undefined);
      res.redirect(this.appendQuery(returnUrl, { google: 'connected' }));
    } catch (err) {
      const reason = (err as Error).message.slice(0, 200);
      res.redirect(this.appendQuery(returnUrl, { google: 'error', reason }));
    }
  }

  // ---- post-connect endpoints --------------------------------------------

  @Get('me/google-calendar')
  @UseGuards(CognitoGuard)
  async status(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<GoogleCalendarStatus> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    const row = await this.tokens.getByUserId(me.id);
    return {
      configured: this.oauth.isConfigured(),
      connected: !!row,
      googleEmail: row?.googleEmail,
      lastSyncedAt: row?.updatedAt ? row.updatedAt.toISOString() : undefined,
    };
  }

  @Delete('me/google-calendar')
  @UseGuards(CognitoGuard)
  @HttpCode(204)
  async disconnect(@CurrentUser() ctx: { sub: string; email: string }): Promise<void> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    // Wipe the tokens AND the synced busy windows — leaving busy
    // blocks behind would silently keep blocking bookings even after
    // the provider disconnected.
    await this.tokens.delete(me.id);
    await this.calendar.syncAllConnected().catch(() => undefined);
  }

  @Post('me/google-calendar/sync')
  @UseGuards(CognitoGuard)
  async syncNow(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body() _body: unknown,
  ): Promise<{ eventCount: number; syncedAt: string }> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    const result = await this.calendar.syncOne(me.id);
    return {
      eventCount: result.eventCount,
      syncedAt: result.syncedAt.toISOString(),
    };
  }

  // ---- helpers ------------------------------------------------------------

  private frontendReturnUrl(): string {
    return (
      this.env.GOOGLE_OAUTH_FRONTEND_RETURN_URL ?? 'http://localhost:3030/profile/personal'
    );
  }

  private appendQuery(url: string, params: Record<string, string>): string {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return u.toString();
  }
}

export interface GoogleCalendarStatus {
  /** True iff the backend env has Google OAuth credentials. */
  configured: boolean;
  /** True iff the current user has a token row. */
  connected: boolean;
  googleEmail?: string;
  lastSyncedAt?: string;
}
