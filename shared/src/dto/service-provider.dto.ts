import { z } from 'zod';

import { ServiceType } from '../enums/service-type.js';

/** Provider's general profile (no prices here — those live in offerings). */
export const UpsertServiceProviderProfileDto = z.object({
  bio: z.string().max(2000).nullable().optional(),
  serviceRadiusKm: z.number().positive().max(100).optional(),
  baseLat: z.number().min(-90).max(90).nullable().optional(),
  baseLng: z.number().min(-180).max(180).nullable().optional(),
});
export type UpsertServiceProviderProfileDto = z.infer<typeof UpsertServiceProviderProfileDto>;

/** Add or update one service offering with its own price. */
export const UpsertServiceOfferingDto = z.object({
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
  hourlyRateCents: z.number().int().nonnegative().max(100_00_000),
  active: z.boolean().default(true),
});
export type UpsertServiceOfferingDto = z.infer<typeof UpsertServiceOfferingDto>;
