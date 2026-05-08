import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PaymentsModule } from '../payments/payments.module.js';

import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { RecurringSeriesController } from './recurring-series.controller.js';
import { RecurringSeriesService } from './recurring-series.service.js';

@Module({
  imports: [AuthModule, PaymentsModule, NotificationsModule],
  controllers: [BookingsController, RecurringSeriesController],
  providers: [BookingsService, RecurringSeriesService],
  exports: [BookingsService],
})
export class BookingsModule {}
