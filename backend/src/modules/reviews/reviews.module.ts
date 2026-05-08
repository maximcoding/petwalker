import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  // Exported so ProvidersService can read aggregate rating + count from a
  // single source (and so a future moderation flow can reach it).
  exports: [ReviewsService],
})
export class ReviewsModule {}
