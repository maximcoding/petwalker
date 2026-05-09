import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { CalendarSyncService } from './calendar-sync.service.js';
import { CalendarController } from './calendar.controller.js';
import { GoogleCalendarService } from './google-calendar.service.js';
import { GoogleOauthService } from './google-oauth.service.js';
import { GoogleTokensService } from './google-tokens.service.js';

/**
 * Calendar v2 — replaces the v1 iCal-feed module.
 *
 * Service graph:
 *   GoogleOauthService    — pure HTTP wrapper around Google's OAuth.
 *   GoogleTokensService   — DB CRUD on `google_oauth_tokens`, refresh
 *                           access tokens transparently.
 *   GoogleCalendarService — calls freebusy.query.
 *   CalendarSyncService   — drives the periodic sweep + replays busy
 *                           windows into `external_busy_blocks`.
 *
 * The legacy `provider_calendar_feeds` table and `parseIcal()` helper
 * are dropped — see migration 0015.
 */
@Module({
  imports: [AuthModule],
  controllers: [CalendarController],
  providers: [
    CalendarSyncService,
    GoogleCalendarService,
    GoogleOauthService,
    GoogleTokensService,
  ],
  exports: [CalendarSyncService],
})
export class CalendarModule {}
