import { NextResponse } from 'next/server';

import { BOOKINGS, PROVIDER_BY_ID, type MockBooking } from '@/lib/mock';

/**
 * POST /api/bookings — mock create endpoint for the /booking/new wizard.
 *
 * Appends to the in-memory `BOOKINGS` array. Survives only for the
 * dev-server process — restarts wipe newly-created bookings, which is
 * fine for the stub.
 *
 * Real backend lands in M-Backend-handshake. The wizard contract
 * (request shape + response shape) is what survives the swap.
 */

interface CreateBookingBody {
  providerId: string;
  serviceCategory: string;
  petId: string;
  startsAt: string; // ISO local datetime
  pickupMode: 'owner-home' | 'provider-home' | 'meeting-point';
  pickupAddress: string;
  careNotes: string;
  termsAccepted: boolean;
}

function nextId(): string {
  return `b_${Math.random().toString(36).slice(2, 9)}`;
}

const ACCOMMODATION_MAP = {
  'owner-home': 'atOwnerHome',
  'provider-home': 'atProviderLocation',
  'meeting-point': 'atCustomAddress',
} as const;

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as Partial<CreateBookingBody>;

  if (
    !body.providerId ||
    !body.serviceCategory ||
    !body.petId ||
    !body.startsAt ||
    !body.termsAccepted
  ) {
    return NextResponse.json(
      { error: 'Missing required fields.' },
      { status: 400 },
    );
  }

  const provider = PROVIDER_BY_ID[body.providerId];
  if (!provider) {
    return NextResponse.json({ error: 'Provider not found.' }, { status: 404 });
  }

  const service = provider.services.find((s) => s.category === body.serviceCategory);
  if (!service) {
    return NextResponse.json(
      { error: 'Provider does not offer this service.' },
      { status: 400 },
    );
  }

  const durationMin = service.defaultDurationMin;
  const baseRateCents = service.hourlyRateCents ?? service.perStayRateCents ?? 0;
  const baseCents = service.hourlyRateCents
    ? Math.round((baseRateCents * durationMin) / 60)
    : baseRateCents;
  const platformFeeCents = Math.round(baseCents * 0.14);
  const totalCents = baseCents + platformFeeCents;

  const newBooking: MockBooking = {
    id: nextId(),
    ownerId: 'me',
    providerId: body.providerId,
    serviceCategory: service.category,
    status: 'pending',
    mode: service.modes[0] ?? 'timeSlot',
    scheduledAt: new Date(body.startsAt),
    durationMin,
    petIds: [body.petId],
    accommodation: ACCOMMODATION_MAP[body.pickupMode],
    totalCents,
    platformFeeCents,
    notes: body.careNotes || undefined,
    createdAt: new Date(),
  };

  BOOKINGS.push(newBooking);

  return NextResponse.json({ id: newBooking.id }, { status: 201 });
}

export async function GET(): Promise<NextResponse> {
  // Return all bookings for the mock owner. Real backend filters by
  // authenticated user.
  return NextResponse.json(BOOKINGS.filter((b) => b.ownerId === 'me'));
}
