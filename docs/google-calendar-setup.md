# Google Calendar OAuth — setup checklist

The "Connect Google Calendar" flow on `/profile/personal` (provider mode) replaces the old iCal-URL form. It uses standard Google OAuth 2.0 — same pattern as "Sign in with Google".

This doc covers the one-time admin setup.

## Architecture in one paragraph

The backend (`backend/src/modules/calendar`) runs the OAuth dance directly against `accounts.google.com`. We don't go through Cognito's federated identity for this — Cognito's Google IdP gives us _identity_ (sub + email) but not API tokens we can call against `googleapis.com`. So we register the petwalker server itself as a Google OAuth client and store per-user `(access_token, refresh_token)` pairs in `google_oauth_tokens`. The periodic sync (every 30 min) calls `freebusy.query` and replays busy windows into `external_busy_blocks`, which the existing booking-availability check already consumes.

## 1. Create the OAuth client in Google Cloud Console

1. Go to <https://console.cloud.google.com/apis/credentials>. Pick (or create) a project — you can reuse the same project that backs the Cognito Google IdP.
2. Enable the **Google Calendar API** for the project: APIs & Services → Library → search "Calendar API" → Enable.
3. **Configure the OAuth consent screen** if you haven't:
   - User type: **External** (unless you're a Workspace org).
   - App name, support email, developer contact email — required.
   - Scopes — add: `.../auth/calendar.freebusy` and `.../auth/userinfo.email` and `openid`.
   - Test users (while the app is in "Testing"): add the Google accounts you'll be testing with, otherwise Google blocks the consent.
4. **Create credentials** → OAuth client ID → application type **Web application**.
   - Authorised redirect URIs:
     - `http://localhost:3001/auth/google-calendar/callback` (dev)
     - `https://api.your-domain.com/auth/google-calendar/callback` (prod)
   - Copy the **Client ID** and **Client secret** — you'll need them next.

## 2. Wire env vars into the backend

Add to `backend/.env` (and your prod secret store):

```bash
# Google Calendar OAuth — backend-side OAuth client.
# Same Google Cloud project as the Cognito Google IdP, but a separate
# OAuth client (Cognito's federation can't expose Google access tokens
# to us, so we run our own OAuth handshake just for Calendar scope).
GOOGLE_OAUTH_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=...

# Where Google redirects the browser after consent. Must match a URI
# registered above. Backend exposes /auth/google-calendar/callback.
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3001/auth/google-calendar/callback

# Where the backend sends the user after exchanging the code. The
# frontend renders a toast based on `?google=connected|cancelled|error`.
GOOGLE_OAUTH_FRONTEND_RETURN_URL=http://localhost:3030/profile/personal
```

`GoogleOauthService.isConfigured()` flips to `true` once the three required vars are set; the frontend hides the Connect button (and shows a yellow "not configured" notice) until then.

## 3. Run the migration

```bash
cd backend
npx drizzle-kit migrate    # picks up 0015_google_oauth_tokens.sql
```

The migration only adds `google_oauth_tokens`. The legacy `provider_calendar_feeds` and its synced `external_busy_blocks` rows stay around for one release — migration `0016` (TBD) will drop them.

## 4. Smoke test

1. Sign in to the web app as a provider.
2. Profile → Personal → Google Calendar card → **Connect Google Calendar**.
3. Browser bounces to Google's consent screen. Grant access.
4. You land back on `/profile/personal?google=connected` and see "Connected to Google Calendar · alice@gmail.com".
5. Add a busy event in your Google calendar within the next 60 days.
6. Click **Sync now** in the app. The toast should report "Synced N busy windows".
7. Browse the booking flow as an owner — the slot covering your busy window should be unavailable.

## Notes for the next iteration

- **Cognito sign-in token capture (deferred).** Today the user OAuths twice if they signed in via Google: once to log in, once to grant calendar scope. We can collapse this by adding a Cognito Lambda `PostAuthentication` trigger that captures the federated Google access token from the auth event and POSTs it to a backend webhook. The infra for this lives in AWS (User Pool → Lambda triggers) so it's intentionally not in this PR.
- **Token encryption at rest.** `access_token` / `refresh_token` are stored as plain text — same trust level as the Cognito sub already on `users`. If we tighten this, use pgcrypto column encryption with a key from KMS; a comment in `google-oauth-tokens.ts` flags the column for future treatment.
- **Disconnect = wipe.** `DELETE /me/google-calendar` drops the token row; the next periodic sweep observes the row is gone and `external_busy_blocks` for that provider get cleared on the following sync. Bookings already taken stay.
- **Refresh-token revocation.** If the user unlinks petwalker in their Google account, our refresh call gets `invalid_grant`. `CalendarSyncService.runSync` catches `RefreshTokenRevokedError`, wipes the token row, and the UI flips back to the "Connect" state on next status fetch.
