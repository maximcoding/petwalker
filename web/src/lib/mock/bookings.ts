import type { MockBooking } from './types';

function inHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60_000);
}

const $ = (dollars: number) => Math.round(dollars * 100);

export const BOOKINGS: MockBooking[] = [
  {
    id: 'b_001',
    ownerId: 'me',
    providerId: 'p_001', // Sara Khan
    serviceCategory: 'walking',
    status: 'confirmed',
    mode: 'timeSlot',
    scheduledAt: inHours(20),
    durationMin: 45,
    petIds: ['pet_001'],
    accommodation: 'atOwnerHome',
    totalCents: $(42.5),
    platformFeeCents: $(5.95),
    notes: 'Door code 4827. Harness is on the hook by the door.',
    createdAt: inHours(-48),
  },
  {
    id: 'b_002',
    ownerId: 'me',
    providerId: 'p_012', // Oakley Field
    serviceCategory: 'walking',
    status: 'confirmed',
    mode: 'timeSlot',
    scheduledAt: inHours(72),
    durationMin: 30,
    petIds: ['pet_002'],
    accommodation: 'atOwnerHome',
    totalCents: $(34.5),
    platformFeeCents: $(4.83),
    createdAt: inHours(-12),
  },
  {
    id: 'b_003',
    ownerId: 'me',
    providerId: 'p_005', // Diego — boarding
    serviceCategory: 'boarding',
    status: 'pending',
    mode: 'dateRange',
    scheduledAt: inHours(24 * 9),
    checkIn: inHours(24 * 9),
    checkOut: inHours(24 * 12),
    durationMin: 24 * 60 * 3,
    petIds: ['pet_001'],
    accommodation: 'atProviderLocation',
    totalCents: $(255),
    platformFeeCents: $(35.7),
    createdAt: inHours(-2),
  },
  {
    id: 'b_004',
    ownerId: 'me',
    providerId: 'p_003', // Jamie Groomer
    serviceCategory: 'grooming',
    status: 'completed',
    mode: 'timeSlot',
    scheduledAt: inHours(-24 * 5),
    durationMin: 90,
    petIds: ['pet_002'],
    accommodation: 'atOwnerHome',
    totalCents: $(115),
    platformFeeCents: $(16.1),
    createdAt: inHours(-24 * 12),
  },
  {
    id: 'b_005',
    ownerId: 'me',
    providerId: 'p_004', // Olivia Patel
    serviceCategory: 'sitting',
    status: 'completed',
    mode: 'timeSlot',
    scheduledAt: inHours(-24 * 10),
    durationMin: 120,
    petIds: ['pet_003'],
    accommodation: 'atOwnerHome',
    totalCents: $(56),
    platformFeeCents: $(7.84),
    createdAt: inHours(-24 * 14),
  },
];

export const BOOKINGS_BY_ID = Object.fromEntries(BOOKINGS.map((b) => [b.id, b])) as Record<
  string,
  MockBooking
>;

/** Sort by upcoming (confirmed/pending) — soonest first. */
export function upcomingBookings(): MockBooking[] {
  const now = Date.now();
  return BOOKINGS
    .filter((b) => (b.status === 'confirmed' || b.status === 'pending') && b.scheduledAt.getTime() >= now - 60 * 60_000)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

export function recentlyBooked(): MockBooking[] {
  return BOOKINGS
    .filter((b) => b.status === 'completed')
    .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
}
