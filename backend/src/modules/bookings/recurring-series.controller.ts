import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import { RecurringSeriesService } from './recurring-series.service.js';

import {
  CancelBookingDto,
  CreateRecurringSeriesDto,
  type CreateRecurringSeriesResponse,
  type RecurringSeries,
} from '@petwalker/shared';

@Controller('recurring-series')
@UseGuards(CognitoGuard)
export class RecurringSeriesController {
  constructor(
    @Inject(RecurringSeriesService) private readonly series: RecurringSeriesService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Post()
  async create(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(CreateRecurringSeriesDto)) dto: CreateRecurringSeriesDto,
  ): Promise<CreateRecurringSeriesResponse> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.series.create(me.id, dto);
  }

  @Get(':id')
  async get(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id') id: string,
  ): Promise<RecurringSeries> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.series.get(me.id, id);
  }

  @Post(':id/cancel-remaining')
  @HttpCode(200)
  async cancelRemaining(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CancelBookingDto)) dto: CancelBookingDto,
  ): Promise<{ cancelledCount: number }> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.series.cancelRemaining(me.id, id, dto);
  }
}
