import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { ENV_TOKEN, type Env } from '../../config/env.js';
import { AuthModule } from '../auth/auth.module.js';

import { PushTokensController } from './push-tokens.controller.js';
import { NotificationsService, PUSH_QUEUE } from './notifications.service.js';
import { PushWorker } from './push.worker.js';
import { pushDispatcherProvider } from './push-dispatcher.js';

@Module({
  imports: [
    AuthModule,
    BullModule.forRootAsync({
      inject: [ENV_TOKEN],
      useFactory: (env: Env) => ({
        connection: { url: env.REDIS_URL },
      }),
    }),
    BullModule.registerQueue({ name: PUSH_QUEUE }),
  ],
  controllers: [PushTokensController],
  providers: [NotificationsService, PushWorker, pushDispatcherProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
