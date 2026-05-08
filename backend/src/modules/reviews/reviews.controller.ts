import {
  Body,
  Controller,
  Get,
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

import { ReviewsService } from './reviews.service.js';

import {
  type CreateReviewDto,
  CreateReviewDto as CreateReviewSchema,
  type ListReviewsQuery,
  ListReviewsQuery as ListReviewsSchema,
} from '@petwalker/shared/dto';
import type {
  CursorPage,
  Review,
  ReviewWithAuthor,
} from '@petwalker/shared/types';

/**
 * Reviews live on `/bookings/:id/review` (write + GET single) and
 * `/providers/:id/reviews` (paginated list). All endpoints are
 * Cognito-guarded since they reveal owner-authored content.
 */
@Controller()
@UseGuards(CognitoGuard)
export class ReviewsController {
  constructor(
    @Inject(ReviewsService) private readonly reviews: ReviewsService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Post('bookings/:id/review')
  async create(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) bookingId: string,
    @Body(new ZodValidationPipe(CreateReviewSchema)) dto: CreateReviewDto,
  ): Promise<Review> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.reviews.create(me.id, bookingId, dto);
  }

  @Get('bookings/:id/review')
  async forBooking(
    @Param('id', new ParseUUIDPipe()) bookingId: string,
  ): Promise<Review | null> {
    return this.reviews.forBooking(bookingId);
  }

  @Get('providers/:id/reviews')
  async listForProvider(
    @Param('id', new ParseUUIDPipe()) providerId: string,
    @Query(new ZodValidationPipe(ListReviewsSchema)) q: ListReviewsQuery,
  ): Promise<CursorPage<ReviewWithAuthor>> {
    return this.reviews.listForProvider(providerId, q);
  }
}
