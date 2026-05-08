import type { BookingStatus } from '../enums/booking-status.js';
import type { ServiceType } from '../enums/service-type.js';
import type { UserRole } from '../enums/user-role.js';

import type { Address, AddressSource } from './address.js';
import type { GeoSample, ISODateString, UUID } from './common.js';

/** Who initiated the cancellation (null if booking is not cancelled). */
export type CancelledBy = Extract<UserRole, 'owner' | 'provider'>;

export interface Booking {
  id: UUID;
  ownerId: UUID;
  providerId: UUID;
  petId: UUID;
  serviceType: ServiceType;
  scheduledAt: ISODateString;
  durationMin: number;
  status: BookingStatus;
  /** Locked at booking time: hourlyRateCents * (durationMin / 60), rounded. */
  priceCents: number;
  notes?: string | null;
  recurringSeriesId?: string | null;

  /** Resolved service address — snapshotted at booking time. */
  address: Address;
  /** Where `address` was sourced from on create. */
  addressSource: AddressSource;

  // Cancellation outcome — populated on cancel; M4 (payments) acts on these.
  cancelledBy?: CancelledBy | null;
  cancelledAt?: ISODateString | null;
  cancellationReason?: string | null;
  /** Going back to the owner. 0 if late owner-cancel. */
  refundCents: number;
  /** App's cut from the cancellation. 0 unless owner late-cancelled. */
  appFeeCents: number;
  /** Charged to the provider when they cancel. 0 otherwise. */
  providerFeeCents: number;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** A `Walk` row is created only for ServiceType.Walking bookings (the GPS-tracked kind). */
export interface Walk {
  id: UUID;
  bookingId: UUID;
  startedAt?: ISODateString | null;
  endedAt?: ISODateString | null;
  /** Sampled GPS trail for the walk, jsonb-stored in PG. */
  polyline: GeoSample[];
  distanceM?: number | null;
  createdAt: ISODateString;
}

export interface RecurringSeries {
  id: string;
  ownerId: string;
  providerId: string;
  petId: string;
  serviceType: ServiceType;
  /** 'weekly' | 'biweekly' */
  recurrence: string;
  /** UTC day-of-week values: 0=Sun … 6=Sat */
  daysOfWeek: number[];
  /** 'HH:MM' UTC */
  timeOfDay: string;
  /** 'YYYY-MM-DD' */
  startDate: string;
  /** 'YYYY-MM-DD' */
  endDate: string;
  durationMin: number;
  priceCents: number;
  notes: string | null;
  instanceCount: number;
  cancelledAt: string | null;
  createdAt: string;
}

export interface CreateRecurringSeriesResponse {
  series: RecurringSeries;
  bookings: Booking[];
}
