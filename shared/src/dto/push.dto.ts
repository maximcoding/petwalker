import { z } from 'zod';

import { PushPlatform } from '../enums/push-platform.js';

export const RegisterPushTokenDto = z.object({
  expoToken: z.string().min(10),
  platform: z.enum([PushPlatform.Ios, PushPlatform.Android]),
});
export type RegisterPushTokenDto = z.infer<typeof RegisterPushTokenDto>;
