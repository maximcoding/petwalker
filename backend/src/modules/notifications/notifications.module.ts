import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { AuthModule } from '../auth/auth.module.js';
import { WebNotificationsGateway } from '../ws/web-notifications.gateway.js';

import { PushTokensController } from './push-tokens.controller.js';
import { WebNotificationsController } from './web-notifications.controller.js';
import { NotificationsService, PUSH_QUEUE } from './notifications.service.js';
import { WebNotificationsService, WEB_NOTIF_BROADCAST } from './web-notifications.service.js';
import { PushWorker } from './push.worker.js';
import { pushDispatcherProvider } from './push-dispatcher.js';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: PUSH_QUEUE }),
  ],
  controllers: [PushTokensController, WebNotificationsController],
  providers: [
    NotificationsService,
    PushWorker,
    pushDispatcherProvider,
    WebNotificationsGateway,
    WebNotificationsService,
    {
      provide: WEB_NOTIF_BROADCAST,
      useFactory: (gateway: WebNotificationsGateway) => gateway.getBroadcast(),
      inject: [WebNotificationsGateway],
    },
  ],
  exports: [NotificationsService, WebNotificationsService, WebNotificationsGateway],
})
export class NotificationsModule {}
