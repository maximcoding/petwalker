import type { RegisterPushTokenDto } from '../../dto/push.dto.js';
import type { HttpClient } from '../http.js';

export class PushApi {
  constructor(private readonly http: HttpClient) {}

  register(body: RegisterPushTokenDto): Promise<void> {
    return this.http.post('/push/tokens', body);
  }

  revoke(expoToken: string): Promise<void> {
    return this.http.delete(`/push/tokens/${encodeURIComponent(expoToken)}`);
  }
}
