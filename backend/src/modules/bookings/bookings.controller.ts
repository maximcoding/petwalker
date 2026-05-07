import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import { BookingsService } from './bookings.service.js';

import {
  type CancelBookingDto,
  CancelBookingDto as CancelBookingSchema,
  type CreateBookingDto,
  CreateBookingDto as CreateBookingSchema,
  type ListBookingsQuery,
  ListBookingsQuery as ListBookingsSchema,
} from '@petwalker/shared';
import type { Booking, CursorPage } from '@petwalker/shared';

@Controller('bookings')
@UseGuards(CognitoGuard)
export class BookingsController {
  constructor(
    @Inject(BookingsService) private readonly bookings: BookingsService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get()
  async list(
    @CurrentUser() ctx: { sub: string; email: string },
    @Query(new ZodValidationPipe(ListBookingsSchema)) q: ListBookingsQuery,
  ): Promise<CursorPage<Booking>> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.bookings.list(me.id, q);
  }

  @Get(':id')
  async get(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Booking> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.bookings.get(me.id, id);
  }

  @Post()
  async create(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(CreateBookingSchema)) dto: CreateBookingDto,
  ): Promise<Booking> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.bookings.create(me.id, dto);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Booking> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.bookings.confirm(me.id, id);
  }

  @Post(':id/start')
  @HttpCode(200)
  async start(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Booking> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.bookings.start(me.id, id);
  }

  @Post(':id/end')
  @HttpCode(200)
  async end(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Booking> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.bookings.end(me.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(CancelBookingSchema)) dto: CancelBookingDto,
  ): Promise<Booking> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.bookings.cancel(me.id, id, dto);
  }
}
