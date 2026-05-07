import { Module } from '@nestjs/common';
import { RecentController } from './recent.controller';
import { RecentService } from './recent.service';
import { recentProviders } from './recent.providers';

@Module({
  imports: [],
  providers: [RecentService, ...recentProviders],
  exports: [RecentService],
  controllers: [RecentController],
})
export class RecentModule {}
