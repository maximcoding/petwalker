import type { ServiceType } from '@petwalker/shared';

/**
 * Returns the maximum number of times-per-day slots allowed for a recurring
 * series of the given service type.
 *
 * Services like dog-walking can reasonably be scheduled multiple times per day
 * (morning/noon/evening), while appointment-style services (grooming, boarding,
 * veterinary, etc.) make sense only once per day.
 */
export function getMaxTimesPerDay(serviceType: ServiceType): number {
  switch (serviceType) {
    case 'walking':
    case 'fitness':
    case 'senior_care':
      return 3;
    default:
      return 1;
  }
}
