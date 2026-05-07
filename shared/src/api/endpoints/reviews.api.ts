import type { CreateReviewDto } from '../../dto/review.dto.js';
import type { UUID } from '../../types/common.js';
import type { Review } from '../../types/review.js';
import type { HttpClient } from '../http.js';

export class ReviewsApi {
  constructor(private readonly http: HttpClient) {}

  forBooking(bookingId: UUID): Promise<Review | null> {
    return this.http.get(`/bookings/${bookingId}/review`);
  }

  forWalker(walkerId: UUID): Promise<Review[]> {
    return this.http.get(`/walkers/${walkerId}/reviews`);
  }

  create(bookingId: UUID, body: CreateReviewDto): Promise<Review> {
    return this.http.post(`/bookings/${bookingId}/review`, body);
  }
}
