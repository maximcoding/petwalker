import type { UpsertCalendarFeedDto } from '../../dto/calendar.dto.js';
import type { CalendarFeed, CalendarSyncResult } from '../../types/calendar.js';
import type { HttpClient } from '../http.js';

/**
 * Provider's external calendar feed (iCal). Owner clients never call this —
 * busy slots are folded into availability checks server-side.
 */
export class CalendarApi {
  constructor(private readonly http: HttpClient) {}

  getFeed(): Promise<CalendarFeed | null> {
    return this.http.get('/calendar-feed');
  }

  upsertFeed(body: UpsertCalendarFeedDto): Promise<CalendarFeed> {
    return this.http.put('/calendar-feed', body);
  }

  deleteFeed(): Promise<void> {
    return this.http.delete('/calendar-feed');
  }

  /** Trigger an immediate fetch + sync. Used by the "Test fetch" button. */
  syncNow(): Promise<CalendarSyncResult> {
    return this.http.post('/calendar-feed/sync', {});
  }
}
