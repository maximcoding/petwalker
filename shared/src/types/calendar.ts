/**
 * Connection status of the user's Google Calendar — drives the
 * "Connect Google Calendar" UI:
 *
 *   - configured=false                 → backend has no Google OAuth
 *                                        creds; show a disabled state.
 *   - configured=true, connected=false → show the Connect button.
 *   - connected=true                   → show "Connected as {email}"
 *                                        + Sync now + Disconnect.
 */
export interface GoogleCalendarStatus {
  configured: boolean;
  connected: boolean;
  /** Email of the linked Google account, only present when connected. */
  googleEmail?: string;
  /** ISO 8601 UTC of the most recent successful sync, when connected. */
  lastSyncedAt?: string;
}

/** Result of a manual sync trigger. */
export interface CalendarSyncResult {
  eventCount: number;
  syncedAt: string;
}

/** Single bookable slot returned by the free-slots endpoint. ISO 8601 UTC. */
export interface FreeSlot {
  start: string;
  end: string;
}
