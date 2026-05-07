import { z } from 'zod';

import { BookingStatus } from '../enums/booking-status.js';
import { ServiceType } from '../enums/service-type.js';

const uuid = z.string().uuid();

export const CreateBookingDto = z.object({
  providerId: uuid,
  petId: uuid,
  serviceType: z.enum([
    ServiceType.Walking,
    ServiceType.Grooming,
    ServiceType.Sitting,
    ServiceType.Boarding,
    ServiceType.Training,
  ]),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(15).max(240),
  notes: z.string().max(2000).nullable().optional(),
});
export type CreateBookingDto = z.infer<typeof CreateBookingDto>;

/** Optional reason on cancel. */
export const CancelBookingDto = z.object({
  reason: z.string().max(500).optional(),
});
export type CancelBookingDto = z.infer<typeof CancelBookingDto>;

export const ListBookingsQuery = z.object({
  status: z
    .enum([
      BookingStatus.Pending,
      BookingStatus.Confirmed,
      BookingStatus.InProgress,
      BookingStatus.Completed,
      BookingStatus.Cancelled,
    ])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListBookingsQuery = z.infer<typeof ListBookingsQuery>;
