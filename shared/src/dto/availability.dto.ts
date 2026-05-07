import { z } from 'zod';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const AvailabilitySlotDto = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(HHMM, 'Expected HH:MM (00:00..23:59)'),
    endTime: z.string().regex(HHMM, 'Expected HH:MM (00:00..23:59)'),
  })
  .refine((s) => s.startTime < s.endTime, {
    message: 'startTime must be before endTime',
    path: ['endTime'],
  });
export type AvailabilitySlotDto = z.infer<typeof AvailabilitySlotDto>;

/** PUT body — replaces ALL the provider's slots. Send the full new schedule. */
export const ReplaceAvailabilityDto = z.object({
  slots: z.array(AvailabilitySlotDto).max(50),
});
export type ReplaceAvailabilityDto = z.infer<typeof ReplaceAvailabilityDto>;
