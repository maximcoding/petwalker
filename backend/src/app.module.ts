import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { FavoritesModule } from './modules/favorites/favorites.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MessagesModule } from './modules/messages/messages.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { PetsModule } from './modules/pets/pets.module.js';
import { ProvidersModule } from './modules/providers/providers.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WalksModule } from './modules/walks/walks.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { WsModule } from './modules/ws/ws.module.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    StorageModule,
    AuthModule,
    HealthModule,
    UsersModule,
    PetsModule,
    ProvidersModule,
    BookingsModule,
    WalksModule,
    MessagesModule,
    PaymentsModule,
    CalendarModule,
    FavoritesModule,
    NotificationsModule,
    WsModule,
  ],
})
export class AppModule {}
