import { z } from 'zod';

/**
 * Body for `POST /bookings/:id/review`. The owner submits a 1-5 rating and
 * an optional free-text body. Length cap on body keeps abusive payloads
 * out without needing a separate moderation flag.
 */
export const CreateReviewDto = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).nullable().optional(),
});
export type CreateReviewDto = z.infer<typeof CreateReviewDto>;

/**
 * Cursor-paginated query for `GET /providers/:id/reviews`. Mirrors other
 * cursor-paginated endpoints in the API.
 */
export const ListReviewsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListReviewsQuery = z.infer<typeof ListReviewsQuery>;
