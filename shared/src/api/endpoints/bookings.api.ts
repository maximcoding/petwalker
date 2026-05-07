import type {
  CancelBookingDto,
  CreateBookingDto,
  ListBookingsQuery,
} from '../../dto/booking.dto.js';
import type { ListMessagesQuery, SendMessageDto } from '../../dto/chat.dto.js';
import type { Booking, Walk } from '../../types/booking.js';
import type { CursorPage, UUID } from '../../types/common.js';
import type { Message } from '../../types/message.js';
import type { HttpClient } from '../http.js';

export class BookingsApi {
  constructor(private readonly http: HttpClient) {}

  list(query: Partial<ListBookingsQuery> = {}): Promise<CursorPage<Booking>> {
    return this.http.get('/bookings', query);
  }

  get(id: UUID): Promise<Booking> {
    return this.http.get(`/bookings/${id}`);
  }

  create(body: CreateBookingDto): Promise<Booking> {
    return this.http.post('/bookings', body);
  }

  /** Provider only. pending → confirmed. */
  confirm(id: UUID): Promise<Booking> {
    return this.http.post(`/bookings/${id}/confirm`);
  }

  /** Provider only. confirmed → in_progress. M3 will create the `walk` row. */
  start(id: UUID): Promise<Booking> {
    return this.http.post(`/bookings/${id}/start`);
  }

  /** Provider only. in_progress → completed. */
  end(id: UUID): Promise<Booking> {
    return this.http.post(`/bookings/${id}/end`);
  }

  /** Owner OR provider. non-terminal → cancelled. Body: optional reason. */
  cancel(id: UUID, body: CancelBookingDto = {}): Promise<Booking> {
    return this.http.post(`/bookings/${id}/cancel`, body);
  }

  walk(bookingId: UUID): Promise<Walk> {
    return this.http.get(`/bookings/${bookingId}/walk`);
  }

  /** Cursor-paginated chat history. Loaded once on join, then WS streams new messages. */
  messages(
    bookingId: UUID,
    query: Partial<ListMessagesQuery> = {},
  ): Promise<CursorPage<Message>> {
    return this.http.get(`/bookings/${bookingId}/messages`, query);
  }

  /** Fallback for sending a chat message when no WS is open (push-notification reply path). */
  sendMessage(bookingId: UUID, body: SendMessageDto): Promise<Message> {
    return this.http.post(`/bookings/${bookingId}/messages`, body);
  }
}
