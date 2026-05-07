import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service.js';
import { CognitoGuard } from './cognito.guard.js';
import { CurrentUser } from './current-user.decorator.js';

import type { User } from '@petwalker/shared/types';

@Controller('auth')
@UseGuards(CognitoGuard)
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get('me')
  me(@CurrentUser() ctx: { sub: string; email: string }): Promise<User> {
    return this.auth.upsertUser(ctx.sub, ctx.email);
  }
}
