import {
  Body,
  Controller,
  Get,
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

import { MessagesService } from './messages.service.js';

import {
  type ListMessagesQuery,
  ListMessagesQuery as ListMessagesSchema,
  type SendMessageDto,
  SendMessageDto as SendMessageSchema,
} from '@petwalker/shared';
import type { CursorPage, Message } from '@petwalker/shared';

@Controller('bookings')
@UseGuards(CognitoGuard)
export class MessagesController {
  constructor(
    @Inject(MessagesService) private readonly messages: MessagesService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get(':id/messages')
  async list(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) bookingId: string,
    @Query(new ZodValidationPipe(ListMessagesSchema)) q: ListMessagesQuery,
  ): Promise<CursorPage<Message>> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.messages.list(me.id, bookingId, q);
  }

  /** Fallback for clients that can't keep a chat WS open. */
  @Post(':id/messages')
  async send(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) bookingId: string,
    @Body(new ZodValidationPipe(SendMessageSchema)) dto: SendMessageDto,
  ): Promise<Message> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.messages.send(me.id, bookingId, dto);
  }
}
