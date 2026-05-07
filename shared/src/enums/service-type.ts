export const ServiceType = {
  Walking: 'walking',
  Grooming: 'grooming',
  Sitting: 'sitting',                   // owner's home, daytime
  Boarding: 'boarding',                 // overnight
  Training: 'training',
  Daycare: 'daycare',                   // group / facility daytime
  Photography: 'photography',           // pet photography & art
  MassageWellness: 'massage_wellness',  // therapeutic massage / wellness
  SeniorCare: 'senior_care',            // older-pet specialist care
  Veterinary: 'veterinary',             // licensed vet consultations
  Fitness: 'fitness',                   // structured exercise / agility
} as const;

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const SERVICE_TYPES = [
  'walking',
  'grooming',
  'sitting',
  'boarding',
  'training',
  'daycare',
  'photography',
  'massage_wellness',
  'senior_care',
  'veterinary',
  'fitness',
] as const satisfies readonly ServiceType[];
