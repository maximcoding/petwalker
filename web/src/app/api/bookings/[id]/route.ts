import { NextResponse } from 'next/server';

import { BOOKINGS, type MockBooking } from '@/lib/mock';
import type { BookingStatus } from '@/lib/booking-lifecycle';

/**
 * /api/bookings/[id] — mock read + status-patch endpoint.
 *
 * GET returns the booking by id (or 404). PATCH updates the booking's
 * status — used by the detail-page action footer to drive Cancel,
 * Reschedule, and (provider-side) Start / Complete transitions.
 *
 * The real backend will enforce the state-machine via the same
 * `canTransition()` rules — this mock applies the patch unconditionally
 * since the UI already filters which actions surface per status.
 */

type ContextParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: ContextParams): Promise<NextResponse> {
  const { id } = await ctx.params;
  const b = BOOKINGS.find((x) => x.id === id);
  if (!b) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  return NextResponse.json(b);
}

interface PatchBody {
  status?: BookingStatus;
  notes?: string;
}

export async function PATCH(req: Request, ctx: ContextParams): Promise<NextResponse> {
  const { id } = await ctx.params;
  const body = (await req.json()) as PatchBody;
  const idx = BOOKINGS.findIndex((x) => x.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  const next: MockBooking = { ...BOOKINGS[idx] };
  if (body.status) next.status = body.status;
  if (body.notes !== undefined) next.notes = body.notes;
  BOOKINGS[idx] = next;
  return NextResponse.json(next);
}
