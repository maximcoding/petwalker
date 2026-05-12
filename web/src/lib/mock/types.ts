/**
 * Mock-layer shapes. These deliberately mirror the canonical types that
 * will eventually move into `@petwalker/shared/types` once the backend
 * catches up to the brief. Until then, screens import from here.
 */

export type ServiceCategory =
  | 'walking'
  | 'sitting'
  | 'grooming'
  | 'boarding'
  | 'training'
  | 'daycare'
  | 'fitness'
  | 'vetVisit'
  | 'photography'
  | 'massage'
  | 'seniorCare';

export type BookingMode = 'timeSlot' | 'dateRange';

export type AccommodationKind =
  | 'atOwnerHome'
  | 'atProviderLocation'
  | 'atCustomAddress';

export interface MockProvider {
  id: string;
  name: string;
  avatar: string;
  coverPhoto: string;
  rating: number;
  reviewCount: number;
  baseAddress: string;
  city: string;
  coverageKm: number;
  distanceKm: number;
  languages: string[];
  yearsExperience: number;
  experienceStartYear: number;
  responseTimeAvgMin: number;
  verified: boolean;
  bio: string;
  shortBio: string;
  services: MockProviderService[];
  photos: string[];
  /** True when provider is on time-off; `backOn` indicates return date. */
  onTimeOff?: boolean;
  backOn?: Date;
}

export interface MockProviderService {
  category: ServiceCategory;
  hourlyRateCents?: number;
  perStayRateCents?: number;
  defaultDurationMin: number;
  modes: BookingMode[];
  accommodation: AccommodationKind[];
  perPetSurchargeCents?: number;
}

export interface MockPet {
  id: string;
  ownerId: string;
  name: string;
  photo: string;
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'reptile' | 'other';
  breed: string;
  dob: Date;
  weightKg: number;
  sex: 'male' | 'female';
  neutered: boolean;
  feeding?: string;
  medications?: string[];
  allergies?: string[];
  behavior?: string[];
}

export interface MockAddress {
  id: string;
  ownerId: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  unit?: string;
  gateCode?: string;
  notes?: string;
  isDefault: boolean;
  lat?: number;
  lng?: number;
}

export interface MockReview {
  id: string;
  bookingId: string;
  ownerName: string;
  ownerAvatar?: string;
  stars: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: Date;
  serviceCategory: ServiceCategory;
  providerReply?: { body: string; createdAt: Date };
}

export interface MockBooking {
  id: string;
  ownerId: string;
  providerId: string;
  serviceCategory: ServiceCategory;
  status: 'pending' | 'confirmed' | 'inProgress' | 'completed' | 'cancelled';
  mode: BookingMode;
  scheduledAt: Date;
  durationMin: number;
  /** For dateRange bookings. */
  checkIn?: Date;
  checkOut?: Date;
  petIds: string[];
  accommodation: AccommodationKind;
  totalCents: number;
  platformFeeCents: number;
  notes?: string;
  createdAt: Date;
}

/* ----- Category metadata ----- */

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  walking: 'Walking',
  sitting: 'Sitting',
  grooming: 'Grooming',
  boarding: 'Boarding',
  training: 'Training',
  daycare: 'Daycare',
  fitness: 'Fitness',
  vetVisit: 'Vet visits',
  photography: 'Photography',
  massage: 'Massage & wellness',
  seniorCare: 'Senior care',
};

export const CATEGORY_HUE: Record<ServiceCategory, string> = {
  walking: 'brand',
  sitting: 'coral',
  grooming: 'lavender',
  boarding: 'mint',
  training: 'sunshine',
  daycare: 'peach',
  fitness: 'sky',
  vetVisit: 'mint',
  photography: 'coral',
  massage: 'lavender',
  seniorCare: 'peach',
};

export const ALL_CATEGORIES: ServiceCategory[] = [
  'walking',
  'sitting',
  'grooming',
  'boarding',
  'training',
  'daycare',
  'fitness',
  'vetVisit',
  'photography',
  'massage',
  'seniorCare',
];
