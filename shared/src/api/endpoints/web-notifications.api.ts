import type { WebNotification } from '../../types/web-notification.js';
import type { HttpClient } from '../http.js';

export class WebNotificationsApi {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<WebNotification[]> {
    return this.http.get('/notifications');
  }

  markRead(id: string): Promise<void> {
    return this.http.post(`/notifications/${id}/read`, {});
  }

  markAllRead(): Promise<void> {
    return this.http.post('/notifications/read-all', {});
  }
}
