import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { WalksController } from './walks.controller.js';
import { WalksService } from './walks.service.js';

@Module({
  imports: [AuthModule],
  controllers: [WalksController],
  providers: [WalksService],
  exports: [WalksService],
})
export class WalksModule {}
