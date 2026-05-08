import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import { FavoritesService } from './favorites.service.js';

import {
  type ListFavoritesQuery,
  ListFavoritesQuery as ListFavoritesSchema,
} from '@petwalker/shared/dto';
import type {
  CursorPage,
  FavoriteToggleResult,
  ServiceProviderListing,
} from '@petwalker/shared/types';

/**
 * Toggle endpoints live on `/providers/:id/favorite` so the UI can call
 * them directly from a `ProviderCard` without first looking up the favorite
 * row. The list lives on `/me/favorites` to mirror `/me/...` patterns
 * elsewhere (e.g. `/me/calendar-feeds`).
 *
 * All endpoints are guarded by Cognito — favorites are private to the
 * authenticated user.
 */
@Controller()
@UseGuards(CognitoGuard)
export class FavoritesController {
  constructor(
    @Inject(FavoritesService) private readonly favorites: FavoritesService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Post('providers/:id/favorite')
  @HttpCode(200)
  async add(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) providerId: string,
  ): Promise<FavoriteToggleResult> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.favorites.add(me.id, providerId);
  }

  @Delete('providers/:id/favorite')
  async remove(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) providerId: string,
  ): Promise<FavoriteToggleResult> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.favorites.remove(me.id, providerId);
  }

  @Get('me/favorites')
  async list(
    @CurrentUser() ctx: { sub: string; email: string },
    @Query(new ZodValidationPipe(ListFavoritesSchema)) q: ListFavoritesQuery,
  ): Promise<CursorPage<ServiceProviderListing>> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.favorites.listMine(me.id, q);
  }
}
