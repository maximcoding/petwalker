import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CognitoGuard } from './cognito.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, CognitoGuard],
  exports: [AuthService, CognitoGuard],
})
export class AuthModule {}
