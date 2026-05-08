import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { AuthModule } from '../auth/auth.module.js';

import { PushTokensController } from './push-tokens.controller.js';
import { NotificationsService, PUSH_QUEUE } from './notifications.service.js';
import { PushWorker } from './push.worker.js';
import { pushDispatcherProvider } from './push-dispatcher.js';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: PUSH_QUEUE }),
  ],
  controllers: [PushTokensController],
  providers: [NotificationsService, PushWorker, pushDispatcherProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
