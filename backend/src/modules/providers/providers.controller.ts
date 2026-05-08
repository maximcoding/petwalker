import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

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
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get()
  async search(
    @CurrentUser() ctx: { sub: string; email: string },
    @Query(new ZodValidationPipe(SearchProvidersSchema)) q: SearchProvidersQuery,
  ): Promise<CursorPage<ServiceProviderListing>> {
    // upsertUser is cheap (single SELECT after first hit) and gives us a
    // stable internal id for the favorites lookup.
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.providers.search(q, me.id);
  }

  @Get(':id')
  async get(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ServiceProviderDetail> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.providers.getProfile(id, me.id);
  }

  @Get(':id/free-slots')
  getFreeSlots(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new ZodValidationPipe(FreeSlotsSchema)) q: FreeSlotsQuery,
  ): Promise<FreeSlot[]> {
    return this.freeSlots.compute(id, q);
  }
}
