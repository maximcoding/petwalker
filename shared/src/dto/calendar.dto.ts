import { z } from 'zod';

/**
 * Provider's iCal feed configuration. URL must be http/https — Apple/Google
 * both serve calendars via webcal://, but most readers (including ours)
 * normalize webcal: → https: at fetch time. We keep the validator strict and
 * the client converts before submitting.
 */
export const UpsertCalendarFeedDto = z.object({
  icalUrl: z.string().url().max(2048),
  enabled: z.boolean().default(true),
});
export type UpsertCalendarFeedDto = z.infer<typeof UpsertCalendarFeedDto>;
