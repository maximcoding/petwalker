/** Provider's iCal feed status — what the profile UI renders. */
export interface CalendarFeed {
  icalUrl: string;
  enabled: boolean;
  /** ISO 8601 UTC. null until first successful sync. */
  lastSyncedAt: string | null;
  /** Last sync error message, if any. Cleared on next successful sync. */
  lastSyncError: string | null;
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
