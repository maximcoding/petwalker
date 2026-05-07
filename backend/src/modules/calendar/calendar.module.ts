import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { CalendarController } from './calendar.controller.js';
import { CalendarSyncService } from './calendar-sync.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CalendarController],
  providers: [CalendarSyncService],
  exports: [CalendarSyncService],
})
export class CalendarModule {}
