import type { CreateReviewDto } from '../../dto/review.dto.js';
import type { CursorPage, UUID } from '../../types/common.js';
import type { Review, ReviewWithAuthor } from '../../types/review.js';
import type { HttpClient } from '../http.js';

/**
 * Owner-side reviews — leave one per completed booking, list by provider.
 *
 * The list endpoint returns `ReviewWithAuthor` so the UI can render an
 * avatar + name without a second round-trip. The `forBooking` getter
 * returns the raw `Review` (or null) since the only caller is the booking
 * detail page, which already knows the author.
 */
export class ReviewsApi {
  constructor(private readonly http: HttpClient) {}

  /** The single review for this booking, or null if the owner hasn't reviewed yet. */
  forBooking(bookingId: UUID): Promise<Review | null> {
    return this.http.get(`/bookings/${bookingId}/review`);
  }

  /** Cursor-paginated reviews for a provider, most-recent first. */
  forProvider(
    providerId: UUID,
    query?: { cursor?: string; limit?: number },
  ): Promise<CursorPage<ReviewWithAuthor>> {
    return this.http.get(`/providers/${providerId}/reviews`, query);
  }

  /** Owner-only — submits a review for a completed booking. */
  create(bookingId: UUID, body: CreateReviewDto): Promise<Review> {
    return this.http.post(`/bookings/${bookingId}/review`, body);
  }
}
