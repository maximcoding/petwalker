import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { FavoritesController } from './favorites.controller.js';
import { FavoritesService } from './favorites.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  // Exported so providers.module can left-flag listings with isFavorited and
  // the future user-deletion flow (M5) can clean up favorite rows.
  exports: [FavoritesService],
})
export class FavoritesModule {}
