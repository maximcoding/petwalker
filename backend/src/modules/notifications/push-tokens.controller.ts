import {
  Body,
  Controller,
  Delete,
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

import { NotificationsService } from './notifications.service.js';

import {
  RegisterPushTokenDto,
} from '@petwalker/shared';

@Controller('push')
@UseGuards(CognitoGuard)
export class PushTokensController {
  constructor(
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Post('tokens')
  @HttpCode(204)
  async register(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(RegisterPushTokenDto)) dto: RegisterPushTokenDto,
  ): Promise<void> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    await this.notifications.registerToken(me.id, dto);
  }

  @Delete('tokens/:expoToken')
  @HttpCode(204)
  async revoke(@Param('expoToken') expoToken: string): Promise<void> {
    await this.notifications.revokeToken(expoToken);
  }
}
