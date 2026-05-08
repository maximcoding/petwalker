import { ServiceType } from './service-type.js';

/**
 * How a provider takes bookings for a particular service.
 *
 * - `window`: provider publishes weekly hours of availability; owner picks
 *   any time inside that window. The booking is validated by the existing
 *   weekly-availability + overlap checks. Good for walking, sitting, etc.
 *
 * - `slot`: provider publishes a list of discrete bookable times (e.g.
 *   appointment slots every 60 min from 9am to 5pm). Owner can only pick a
 *   time that exactly matches an open slot. Good for vet, grooming,
 *   photography, massage, training, fitness.
 *
 * `range` (multi-day boarding) and `recurring` (auto-extending series) are
 * deferred — they need additional schema and UI.
 */
export const BookingMode = {
  Window: 'window',
  Slot: 'slot',
} as const;

export type BookingMode = (typeof BookingMode)[keyof typeof BookingMode];

export const BOOKING_MODES = [
  'window',
  'slot',
] as const satisfies readonly BookingMode[];

/**
 * The booking mode that fits each service out of the box. Providers can
 * override per offering — a walker who wants to run pre-set 30-min slots
 * can switch to slot mode, and a vet who wants to take "any time in office
 * hours" requests can switch to window. The defaults below are based on
 * how each service is typically run in the real world.
 */
export const DEFAULT_BOOKING_MODE: Record<ServiceType, BookingMode> = {
  [ServiceType.Walking]: 'window',
  [ServiceType.Sitting]: 'window',
  [ServiceType.Daycare]: 'window',
  [ServiceType.SeniorCare]: 'window',
  [ServiceType.Boarding]: 'window', // until range mode lands
  [ServiceType.Training]: 'slot',
  [ServiceType.Grooming]: 'slot',
  [ServiceType.Photography]: 'slot',
  [ServiceType.MassageWellness]: 'slot',
  [ServiceType.Fitness]: 'slot',
  [ServiceType.Veterinary]: 'slot',
};

/**
 * Sensible default slot duration in minutes when a provider switches to
 * slot mode without setting a duration. Tuned per service.
 */
export const DEFAULT_SLOT_DURATION_MIN: Record<ServiceType, number> = {
  [ServiceType.Walking]: 30,
  [ServiceType.Sitting]: 60,
  [ServiceType.Daycare]: 240,
  [ServiceType.SeniorCare]: 60,
  [ServiceType.Boarding]: 1440,
  [ServiceType.Training]: 60,
  [ServiceType.Grooming]: 60,
  [ServiceType.Photography]: 90,
  [ServiceType.MassageWellness]: 60,
  [ServiceType.Fitness]: 45,
  [ServiceType.Veterinary]: 30,
};

/**
 * Default supported-source set per service when an offering is first
 * created and the provider hasn't opted in explicitly. Sensible-default
 * tuning so a fresh signup doesn't have to think about it:
 *
 *   - walking / sitting / senior_care → owner only (provider travels)
 *   - daycare / boarding / vet         → provider only (owner travels)
 *   - training / fitness / massage / photography → owner + provider
 *   - grooming → provider (most are salon-based; mobile groomers flip)
 *
 * Custom defaults to false everywhere — niche enough that the provider
 * should opt in deliberately. The `SupportedAddressSources` shape is
 * imported from shared/types but typed structurally here to avoid a
 * circular import (this file is enum-tier, types depend on it).
 */
export const DEFAULT_SUPPORTED_SOURCES: Record<
  ServiceType,
  { owner: boolean; provider: boolean; custom: boolean }
> = {
  [ServiceType.Walking]: { owner: true, provider: false, custom: false },
  [ServiceType.Sitting]: { owner: true, provider: false, custom: false },
  [ServiceType.SeniorCare]: { owner: true, provider: false, custom: false },
  [ServiceType.Daycare]: { owner: false, provider: true, custom: false },
  [ServiceType.Boarding]: { owner: false, provider: true, custom: false },
  [ServiceType.Veterinary]: { owner: false, provider: true, custom: false },
  [ServiceType.Grooming]: { owner: false, provider: true, custom: false },
  [ServiceType.Training]: { owner: true, provider: true, custom: false },
  [ServiceType.Fitness]: { owner: true, provider: true, custom: false },
  [ServiceType.MassageWellness]: { owner: true, provider: true, custom: false },
  [ServiceType.Photography]: { owner: true, provider: true, custom: true },
};
