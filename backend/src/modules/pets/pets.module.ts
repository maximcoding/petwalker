import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { PetsController } from './pets.controller.js';
import { PetsService } from './pets.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PetsController],
  providers: [PetsService],
  exports: [PetsService],
})
export class PetsModule {}
