export const ServiceType = {
  Walking: 'walking',
  Grooming: 'grooming',
  Sitting: 'sitting',     // owner's home, daytime
  Boarding: 'boarding',   // overnight
  Training: 'training',
} as const;

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const SERVICE_TYPES = [
  'walking',
  'grooming',
  'sitting',
  'boarding',
  'training',
] as const satisfies readonly ServiceType[];
