import type {
  CalendarSyncResult,
  GoogleCalendarStatus,
} from '../../types/calendar.js';
import type { HttpClient } from '../http.js';

/**
 * Google Calendar integration — provider-side. Owners never call
 * this; busy windows are folded into availability checks server-side.
 *
 * The OAuth handshake lives at /auth/google-calendar/start (returns
 * `{ url }` for the frontend to set as `window.location`) and
 * /auth/google-calendar/callback (Google's redirect target).
 *
 * The post-connect surface is here:
 *   - getStatus()   → connection state for the UI
 *   - disconnect()  → wipe tokens + busy windows
 *   - syncNow()     → manual freebusy refresh
 */
export class CalendarApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Returns the URL of Google's consent screen. Frontend should set
   * `window.location` to this — it can't follow the redirect via fetch
   * because we'd lose the user's session crossing to accounts.google.com.
   */
  startGoogleConnect(): Promise<{ url: string }> {
    return this.http.get('/auth/google-calendar/start');
  }

  getStatus(): Promise<GoogleCalendarStatus> {
    return this.http.get('/me/google-calendar');
  }

  disconnect(): Promise<void> {
    return this.http.delete('/me/google-calendar');
  }

  /** Trigger an immediate freebusy refresh. */
  syncNow(): Promise<CalendarSyncResult> {
    return this.http.post('/me/google-calendar/sync', {});
  }
}
