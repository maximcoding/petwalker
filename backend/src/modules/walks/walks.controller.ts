import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import { WalksService } from './walks.service.js';

import type { Walk } from '@petwalker/shared';

@Controller('bookings')
@UseGuards(CognitoGuard)
export class WalksController {
  constructor(
    @Inject(WalksService) private readonly walks: WalksService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get(':id/walk')
  async get(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) bookingId: string,
  ): Promise<Walk> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.walks.getByBookingId(me.id, bookingId);
  }
}
