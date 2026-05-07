import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import { CalendarSyncService } from './calendar-sync.service.js';

import {
  type UpsertCalendarFeedDto,
  UpsertCalendarFeedDto as UpsertCalendarFeedSchema,
} from '@petwalker/shared/dto';
import type { CalendarFeed, CalendarSyncResult } from '@petwalker/shared/types';

/**
 * Endpoints for the signed-in provider to manage their external calendar
 * feed. The owner-side never hits this controller — owners only see the
 * downstream effect (busy slots greyed out in the booking picker).
 *
 * GET    /calendar-feed         → current feed config or null
 * PUT    /calendar-feed         → upsert URL + enabled flag
 * DELETE /calendar-feed         → disconnect & wipe synced blocks
 * POST   /calendar-feed/sync    → trigger an immediate fetch (the "Test
 *                                 fetch" button)
 */
@Controller('calendar-feed')
@UseGuards(CognitoGuard)
export class CalendarController {
  constructor(
    @Inject(CalendarSyncService) private readonly calendar: CalendarSyncService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get()
  async get(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<CalendarFeed | null> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    const row = await this.calendar.getFeed(me.id);
    if (!row) return null;
    return {
      icalUrl: row.icalUrl,
      enabled: row.enabled,
      lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
      lastSyncError: row.lastSyncError,
    };
  }

  @Put()
  async upsert(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(UpsertCalendarFeedSchema)) dto: UpsertCalendarFeedDto,
  ): Promise<CalendarFeed> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    const row = await this.calendar.upsertFeed(me.id, dto.icalUrl, dto.enabled);
    return {
      icalUrl: row.icalUrl,
      enabled: row.enabled,
      lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
      lastSyncError: row.lastSyncError,
    };
  }

  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() ctx: { sub: string; email: string }): Promise<void> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    await this.calendar.deleteFeed(me.id);
  }

  @Post('sync')
  async sync(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<CalendarSyncResult> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    const result = await this.calendar.syncOne(me.id);
    return {
      eventCount: result.eventCount,
      syncedAt: result.syncedAt.toISOString(),
    };
  }
}
