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
