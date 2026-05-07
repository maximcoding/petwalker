import { z } from 'zod';

import { ServiceType } from '../enums/service-type.js';

/**
 * Query for `/providers/:id/free-slots`. The window is half-open
 * `[from, to)`. Both are required so the backend has bounds.
 *
 * `serviceType` is required because a provider's offerings can differ in
 * `bookingMode` — the service has to know whether to compute open windows
 * (window mode) or read pre-published slots (slot mode).
 *
 * `step` defaults to durationMin — i.e. a window of [09:00, 11:00) with
 * durationMin=30 yields slots 09:00, 09:30, 10:00, 10:30. Pass a different
 * `step` (e.g. 60) to widen the gap between candidate starts. Ignored in
 * slot mode (slots are pre-cut at the offering's slotDurationMin).
 */
export const FreeSlotsQuery = z.object({
  serviceType: z.enum([
    ServiceType.Walking,
    ServiceType.Grooming,
    ServiceType.Sitting,
    ServiceType.Boarding,
    ServiceType.Training,
    ServiceType.Daycare,
    ServiceType.Photography,
    ServiceType.MassageWellness,
    ServiceType.SeniorCare,
    ServiceType.Veterinary,
    ServiceType.Fitness,
  ]),
  from: z.string().datetime(),
  to: z.string().datetime(),
  durationMin: z.coerce.number().int().min(15).max(1440),
  stepMin: z.coerce.number().int().min(15).max(720).optional(),
});
export type FreeSlotsQuery = z.infer<typeof FreeSlotsQuery>;
