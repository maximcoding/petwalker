import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CognitoGuard } from '../auth/cognito.guard.js';

import { ProvidersService } from './providers.service.js';

import {
  type SearchProvidersQuery,
  SearchProvidersQuery as SearchProvidersSchema,
} from '@petwalker/shared';
import type {
  CursorPage,
  ServiceProviderDetail,
  ServiceProviderListing,
} from '@petwalker/shared';

@Controller('providers')
@UseGuards(CognitoGuard)
export class ProvidersController {
  constructor(@Inject(ProvidersService) private readonly providers: ProvidersService) {}

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
}
