import type { SendMessageDto } from '../../dto/chat.dto.js';
import type { UUID } from '../../types/common.js';
import type { Message } from '../../types/message.js';
import type { HttpClient } from '../http.js';

export class ChatApi {
  constructor(private readonly http: HttpClient) {}

  history(bookingId: UUID): Promise<Message[]> {
    return this.http.get(`/bookings/${bookingId}/messages`);
  }

  send(bookingId: UUID, body: SendMessageDto): Promise<Message> {
    return this.http.post(`/bookings/${bookingId}/messages`, body);
  }
}
