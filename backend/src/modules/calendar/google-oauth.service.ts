import { createHmac, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { ENV_TOKEN, type Env } from '../../config/env.js';

/**
 * Stateless wrapper around Google's OAuth 2.0 endpoints.
 *
 * Used by the calendar-connect flow:
 *   1. Frontend hits `GET /auth/google-calendar/start` → backend redirects
 *      to `buildAuthUrl()` (Google consent screen).
 *   2. Google redirects back with a `code`. Backend calls
 *      `exchangeCode()` → access + refresh tokens.
 *   3. Backend calls `fetchUserInfo()` to learn which Google account
 *      the user just consented as (we display the email in the UI).
 *   4. Tokens persisted by `GoogleTokensService`. When the access token
 *      later expires, that service calls `refreshAccessToken()` here.
 *
 * The service deliberately does NOT touch the DB — it's a pure HTTP
 * helper. Persistence + refresh-on-demand live in `GoogleTokensService`.
 *
 * Failure modes are normalised: any non-2xx response from Google
 * surfaces as a `ServiceUnavailableException` with the body included
 * (Google sometimes returns useful error_descriptions like
 * "invalid_grant" when a refresh token has been revoked).
 */
@Injectable()
export class GoogleOauthService {
  private readonly log = new Logger(GoogleOauthService.name);

  /**
   * The minimum scope for our use case. We only need free/busy windows
   * and the user's email (so we can show "Connected as alice@gmail.com"
   * in the UI). Using `freebusy` instead of `events.readonly` keeps the
   * consent-screen wording reassuring — Google literally tells the user
   * "petwalker can see times you're busy on your calendar" rather than
   * "read all calendar events".
   */
  static readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar.freebusy',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid',
  ] as const;

  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {}

  // ---- public helpers -----------------------------------------------------

  /** True when the env is wired up — the connect button should hide otherwise. */
  isConfigured(): boolean {
    return Boolean(
      this.env.GOOGLE_OAUTH_CLIENT_ID &&
        this.env.GOOGLE_OAUTH_CLIENT_SECRET &&
        this.env.GOOGLE_OAUTH_REDIRECT_URI,
    );
  }

  /**
   * Build the URL we redirect the user to so Google can show its
   * consent screen.
   *
   * `access_type=offline` + `prompt=consent` is the magic combo that
   * forces Google to issue a refresh token EVERY time. Without
   * `prompt=consent`, Google only issues a refresh token on the very
   * first consent — if the user disconnects + reconnects, the second
   * round won't give us one and the integration silently breaks an
   * hour later when the access token expires.
   */
  buildAuthUrl(state: string): string {
    this.requireConfigured();
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.searchParams.set('client_id', this.env.GOOGLE_OAUTH_CLIENT_ID!);
    u.searchParams.set('redirect_uri', this.env.GOOGLE_OAUTH_REDIRECT_URI!);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', GoogleOauthService.SCOPES.join(' '));
    u.searchParams.set('access_type', 'offline');
    u.searchParams.set('prompt', 'consent');
    u.searchParams.set('include_granted_scopes', 'true');
    u.searchParams.set('state', state);
    return u.toString();
  }

  /**
   * Sign the per-request CSRF state. The state token round-trips
   * through Google's redirect, so the callback can verify it came from
   * a flow we started rather than a forged URL.
   */
  signState(payload: string): string {
    const sig = createHmac('sha256', this.stateSecret())
      .update(payload)
      .digest('base64url');
    return `${payload}.${sig}`;
  }

  /** Returns the payload if the state is well-formed and the HMAC matches. */
  verifyState(state: string): string | null {
    const dot = state.lastIndexOf('.');
    if (dot < 0) return null;
    const payload = state.slice(0, dot);
    const sig = state.slice(dot + 1);
    const expected = createHmac('sha256', this.stateSecret())
      .update(payload)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    return timingSafeEqual(a, b) ? payload : null;
  }

  /** Exchange the auth `code` for access + refresh tokens. */
  async exchangeCode(code: string): Promise<TokenResponse> {
    this.requireConfigured();
    const body = new URLSearchParams({
      code,
      client_id: this.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: this.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: this.env.GOOGLE_OAUTH_REDIRECT_URI!,
      grant_type: 'authorization_code',
    });
    return this.postToken(body);
  }

  /** Refresh an access token. Refresh tokens normally don't expire. */
  async refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
    this.requireConfigured();
    const body = new URLSearchParams({
      client_id: this.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: this.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
    const res = await this.postToken(body);
    return {
      accessToken: res.accessToken,
      expiresIn: res.expiresIn,
      scope: res.scope,
    };
  }

  /** Call userinfo with the just-minted access_token to grab the email. */
  async fetchUserInfo(accessToken: string): Promise<{ email: string }> {
    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new ServiceUnavailableException(`Google userinfo ${res.status}: ${txt}`);
    }
    const json = (await res.json()) as { email?: string };
    if (!json.email) {
      throw new ServiceUnavailableException('Google userinfo response missing email');
    }
    return { email: json.email };
  }

  // ---- internal -----------------------------------------------------------

  private requireConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Google OAuth is not configured (set GOOGLE_OAUTH_CLIENT_ID, ' +
          'GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI in env).',
      );
    }
  }

  private async postToken(body: URLSearchParams): Promise<TokenResponse> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const text = await res.text();
    if (!res.ok) {
      this.log.warn(`Google token endpoint ${res.status}: ${text.slice(0, 300)}`);
      throw new ServiceUnavailableException(
        `Google token exchange failed (${res.status}): ${text.slice(0, 300)}`,
      );
    }
    let json: GoogleTokenJson;
    try {
      json = JSON.parse(text) as GoogleTokenJson;
    } catch {
      throw new ServiceUnavailableException('Malformed Google token response');
    }
    if (!json.access_token) {
      throw new ServiceUnavailableException('Google token response missing access_token');
    }
    return {
      accessToken: json.access_token,
      // Refresh token is only present on the auth-code exchange (not on
      // refresh-token exchange) and only when prompt=consent forced a
      // fresh consent. Caller should fall back to the previously stored
      // refresh token if undefined.
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in ?? 3600,
      scope: json.scope ?? GoogleOauthService.SCOPES.join(' '),
      idToken: json.id_token,
    };
  }

  /**
   * Derive an HMAC key from the OAuth client secret. The client secret
   * is already a high-entropy server-side secret; reusing it for the
   * state HMAC means there's no extra env var to manage.
   */
  private stateSecret(): string {
    return this.env.GOOGLE_OAUTH_CLIENT_SECRET ?? 'dev-state-secret';
  }
}

interface GoogleTokenJson {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  token_type?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
  idToken?: string;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  scope: string;
}
