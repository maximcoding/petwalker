import { z } from 'zod';

export const TrackingPingFrame = z.object({
  walkId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  t: z.number().int().nonnegative(),
  accuracy: z.number().nonnegative().optional(),
});
export type TrackingPingFrame = z.infer<typeof TrackingPingFrame>;
