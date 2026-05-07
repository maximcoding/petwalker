import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CognitoGuard } from '../auth/cognito.guard.js';

import { FreeSlotsService } from './free-slots.service.js';
import { ProvidersService } from './providers.service.js';

import {
  type FreeSlotsQuery,
  FreeSlotsQuery as FreeSlotsSchema,
  type SearchProvidersQuery,
  SearchProvidersQuery as SearchProvidersSchema,
} from '@petwalker/shared';
import type {
  CursorPage,
  FreeSlot,
  ServiceProviderDetail,
  ServiceProviderListing,
} from '@petwalker/shared';

@Controller('providers')
@UseGuards(CognitoGuard)
export class ProvidersController {
  constructor(
    @Inject(ProvidersService) private readonly providers: ProvidersService,
    @Inject(FreeSlotsService) private readonly freeSlots: FreeSlotsService,
  ) {}

  @Get()
  search(
    @Query(new ZodValidationPipe(SearchProvidersSchema)) q: SearchProvidersQuery,
  ): Promise<CursorPage<ServiceProviderListing>> {
    return this.providers.search(q);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<ServiceProviderDetail> {
    return this.providers.getProfile(id);
  }

  @Get(':id/free-slots')
  getFreeSlots(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new ZodValidationPipe(FreeSlotsSchema)) q: FreeSlotsQuery,
  ): Promise<FreeSlot[]> {
    return this.freeSlots.compute(id, q);
  }
}
