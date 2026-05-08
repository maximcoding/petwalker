import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { FavoritesModule } from '../favorites/favorites.module.js';

import { FreeSlotsService } from './free-slots.service.js';
import { ProvidersController } from './providers.controller.js';
import { ProvidersService } from './providers.service.js';
import { SlotGeneratorService } from './slot-generator.service.js';

@Module({
  // FavoritesModule is imported so ProvidersService can layer the per-user
  // `isFavorited` flag onto search and detail responses.
  imports: [AuthModule, FavoritesModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, FreeSlotsService, SlotGeneratorService],
  exports: [ProvidersService, FreeSlotsService, SlotGeneratorService],
})
export class ProvidersModule {}
