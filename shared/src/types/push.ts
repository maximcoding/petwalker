import type { PushPlatform } from '../enums/push-platform.js';

import type { ISODateString, UUID } from './common.js';

export interface PushToken {
  id: UUID;
  userId: UUID;
  expoToken: string;
  platform: PushPlatform;
  createdAt: ISODateString;
  revokedAt?: ISODateString | null;
}
