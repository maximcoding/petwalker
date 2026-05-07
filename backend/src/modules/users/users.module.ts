import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ProvidersModule } from '../providers/providers.module.js';

import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  // ProvidersModule exports SlotGeneratorService so the offering-upsert path
  // can publish slots whenever a provider switches an offering to slot mode.
  imports: [AuthModule, ProvidersModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
