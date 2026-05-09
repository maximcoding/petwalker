import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

/**
 * OAuth tokens for the user's connected Google account, scoped to the
 * Google Calendar APIs.
 *
 * One row per user (PK = user_id). We hold both `access_token` and
 * `refresh_token`:
 *  - access_token expires in ~1h; we refresh on demand when it's
 *    within REFRESH_BUFFER_MS of expiry.
 *  - refresh_token is long-lived (issued once when the user grants
 *    `access_type=offline&prompt=consent`). If we ever lose it,
 *    the user has to re-consent.
 *
 * `google_email` is captured at consent time and shown in the UI
 * ("Connected as alice@gmail.com") so the user can confirm which
 * account they linked. It's not used as an FK or a join key — a user
 * could conceivably link a Google account whose email differs from
 * their petwalker email.
 *
 * Tokens are stored as plaintext in the DB row. That's the same trust
 * level as the Stripe customer id and Cognito sub already kept on the
 * `users` table; if we later decide auth secrets warrant column-level
 * encryption (KMS / pgcrypto), this column gets the same treatment.
 */
export const googleOauthTokens = pgTable('google_oauth_tokens', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Email shown on Google's consent screen — purely UI/disambiguation. */
  googleEmail: text('google_email').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  /** Absolute expiry of `accessToken`. We refresh when within ~60s of this. */
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  /**
   * Space-delimited list of granted scopes (mirrors Google's `scope`
   * response field). Stored so we can detect "user revoked one of our
   * scopes" without re-fetching userinfo.
   */
  scope: text('scope').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type GoogleOauthTokenRow = typeof googleOauthTokens.$inferSelect;
export type NewGoogleOauthTokenRow = typeof googleOauthTokens.$inferInsert;
