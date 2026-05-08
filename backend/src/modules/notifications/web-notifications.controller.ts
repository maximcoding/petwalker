import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import { WebNotificationsService, type WebNotification } from './web-notifications.service.js';

@Controller('notifications')
@UseGuards(CognitoGuard)
export class WebNotificationsController {
  constructor(
    @Inject(WebNotificationsService) private readonly webNotifs: WebNotificationsService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get()
  async list(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<WebNotification[]> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.webNotifs.list(me.id);
  }

  @Post(':id/read')
  @HttpCode(204)
  async markRead(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id') id: string,
  ): Promise<void> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    await this.webNotifs.markRead(me.id, id);
  }

  @Post('read-all')
  @HttpCode(204)
  async markAllRead(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<void> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    await this.webNotifs.markAllRead(me.id);
  }
}
