import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { MessagesModule } from '../messages/messages.module.js';
import { WalksModule } from '../walks/walks.module.js';

import { ChatGateway } from './chat.gateway.js';
import { TrackingGateway } from './tracking.gateway.js';

@Module({
  imports: [AuthModule, BookingsModule, MessagesModule, WalksModule],
  providers: [TrackingGateway, ChatGateway],
  exports: [TrackingGateway, ChatGateway],
})
export class WsModule {}
