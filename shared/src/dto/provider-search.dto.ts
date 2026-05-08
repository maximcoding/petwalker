import { z } from 'zod';

import { ServiceType } from '../enums/service-type.js';

export const SearchProvidersQuery = z.object({
  /** Service type to search for. Required — picks the offering catalog filter. */
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

  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(100).default(10),

  /** Optional desired booking time. If set, narrow to providers free in that slot. */
  scheduledAt: z.string().datetime().optional(),
  durationMin: z.coerce.number().int().min(15).max(1440).optional(),

  minRating: z.coerce.number().min(1).max(5).optional(),
  maxHourlyCents: z.coerce.number().int().nonnegative().optional(),

  /**
   * Free-text query — matched against the provider's full name and bio
   * with case-insensitive substring search. Empty string is treated as
   * absent. Capped at 200 chars to bound query cost.
   */
  q: z.string().trim().max(200).optional(),

  /** Cursor pagination. */
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type SearchProvidersQuery = z.infer<typeof SearchProvidersQuery>;
