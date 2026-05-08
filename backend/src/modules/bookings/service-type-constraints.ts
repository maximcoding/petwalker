import type { ServiceType } from '@petwalker/shared/enums';

export const MAX_TIMES_PER_DAY: Record<ServiceType, number> = {
  walking:          4,
  sitting:          3,
  senior_care:      3,
  fitness:          2,
  training:         2,
  grooming:         1,
  boarding:         1,
  daycare:          1,
  photography:      1,
  massage_wellness: 1,
  veterinary:       1,
};

export function getMaxTimesPerDay(serviceType: ServiceType): number {
  return MAX_TIMES_PER_DAY[serviceType] ?? 1;
}
