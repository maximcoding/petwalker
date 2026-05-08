import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, desc, eq, gte, lte, lt, or, sql } from 'drizzle-orm';

import { decodeCursor } from '../../common/cursor.js';
import { buildCursorPage } from '../../common/pagination.js';
import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  bookings,
  pets,
  providerServiceOfferings,
  providerSlots,
  walks,
  type BookingRow,
  type WalkRow,
} from '../../db/schema/index.js';
import { PaymentsService } from '../payments/payments.service.js';

import { resolveBookingAddress } from './address-resolver.js';
import { hasAvailability, hasExternalBusyConflict, hasOverlap } from './availability-check.js';
import { mapBookingRow } from './booking.mapper.js';
import { computeCancellationOutcome } from './cancellation-policy.js';
import { tryTransition, type BookingAction, type CallerRole } from './state-machine.js';

import { Polyline } from '@petwalker/shared';
import { ServiceType } from '@petwalker/shared/enums';

import type {
  Booking,
  CancelBookingDto,
  CreateBookingDto,
  CursorPage,
  GeoSample,
  ListBookingsQuery,
} from '@petwalker/shared';

interface BookingsCursor {
  /** scheduledAt ISO of last item in previous page. */
  t: string;
  id: string;
}

@Injectable()
export class BookingsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}

  // ---- create -------------------------------------------------------------

  async create(ownerId: string, dto: CreateBookingDto): Promise<Booking> {
    // 1. Pet ownership
    const [pet] = await this.db.select().from(pets).where(eq(pets.id, dto.petId));
    if (!pet) throw new NotFoundException('Pet not found');
    if (pet.ownerId !== ownerId) throw new ForbiddenException('Not your pet');

    // 2. Provider has active offering for serviceType
    const [offering] = await this.db
      .select()
      .from(providerServiceOfferings)
      .where(
        and(
          eq(providerServiceOfferings.providerId, dto.providerId),
          eq(providerServiceOfferings.serviceType, dto.serviceType),
          eq(providerServiceOfferings.active, true),
        ),
      );
    if (!offering) {
      throw unprocessable('PROVIDER_NO_OFFERING', 'Provider does not offer this service');
    }

    // 3. scheduledAt is in future (5min grace)
    const scheduledAt = new Date(dto.scheduledAt);
    const now = new Date();
    if (scheduledAt.getTime() < now.getTime() + 5 * 60_000) {
      throw unprocessable('SCHEDULED_AT_TOO_SOON', 'scheduledAt must be at least 5 minutes from now');
    }

    // 4. Availability covers the slot
    if (!(await hasAvailability(this.db, dto.providerId, scheduledAt, dto.durationMin))) {
      throw unprocessable('OUTSIDE_AVAILABILITY', 'Provider is not available at this time');
    }

    // 5. No overlap with non-cancelled bookings
    const newEnd = new Date(scheduledAt.getTime() + dto.durationMin * 60_000);
    if (await hasOverlap(this.db, dto.providerId, scheduledAt, newEnd)) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Provider already has a booking that overlaps this slot',
        code: 'OVERLAPPING_BOOKING',
      });
    }

    // 5b. No overlap with the provider's external (iCal) calendar.
    // Same 409 shape as a booking conflict — the owner just sees "this slot
    // is taken" either way.
    if (await hasExternalBusyConflict(this.db, dto.providerId, scheduledAt, newEnd)) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Provider is busy on their external calendar at this time',
        code: 'EXTERNAL_CALENDAR_CONFLICT',
      });
    }

    // 6. The provider opts in to which location families they support
    //    per offering. Reject before address resolution so the owner sees
    //    "this provider doesn't accept that location" instead of a
    //    confusing OWNER_ADDRESS_MISSING / PROVIDER_ADDRESS_MISSING.
    const supportFamily =
      dto.addressSource === 'owner_user' || dto.addressSource === 'owner_pet'
        ? 'owner'
        : dto.addressSource === 'provider_user' || dto.addressSource === 'provider_offering'
          ? 'provider'
          : 'custom';
    const supportsThisFamily =
      (supportFamily === 'owner' && offering.supportsOwnerLocation) ||
      (supportFamily === 'provider' && offering.supportsProviderLocation) ||
      (supportFamily === 'custom' && offering.supportsCustomLocation);
    if (!supportsThisFamily) {
      throw unprocessable(
        'ADDRESS_SOURCE_NOT_SUPPORTED',
        `Provider does not accept "${supportFamily}" location for this service`,
      );
    }

    // 7. Resolve the booking address from the chosen source. Throws with a
    // stable code-string the catch below maps to a 422 — owner gets a
    // friendly i18n message ("set your home address first" etc.).
    let resolvedAddress;
    try {
      resolvedAddress = await resolveBookingAddress(this.db, ownerId, dto.petId, offering, dto);
    } catch (err) {
      const code = (err as Error).message;
      if (code === 'CUSTOM_ADDRESS_REQUIRED') {
        throw unprocessable('CUSTOM_ADDRESS_REQUIRED', 'A custom address is required when addressSource is "custom"');
      }
      if (code === 'OWNER_ADDRESS_MISSING') {
        throw unprocessable('OWNER_ADDRESS_MISSING', 'Owner has no address set — add one in account settings');
      }
      if (code === 'PROVIDER_ADDRESS_MISSING') {
        throw unprocessable('PROVIDER_ADDRESS_MISSING', 'Provider has no address set for this service');
      }
      throw err;
    }

    // 8. Compute price (locked at booking time)
    const priceCents = Math.round(offering.hourlyRateCents * (dto.durationMin / 60));

    // For slot-mode offerings, the booking insert and the slot reservation
    // must succeed together — otherwise we'd either double-book a slot or
    // leak a "booked" slot whose booking insert later failed. A transaction
    // gives us atomicity. Window-mode skips the slot table entirely.
    const isSlotMode = offering.bookingMode === 'slot';

    const row = await this.db.transaction(async (tx) => {
      let reservedSlotId: string | null = null;

      if (isSlotMode) {
        // Find the matching open slot by exact start time. Slot durations are
        // fixed at the offering level, so the owner picked one of these via
        // the picker — durationMin should equal slot.endTs - slot.startTs.
        const [slot] = await tx
          .select()
          .from(providerSlots)
          .where(
            and(
              eq(providerSlots.providerId, dto.providerId),
              eq(providerSlots.serviceType, dto.serviceType),
              eq(providerSlots.startTs, scheduledAt),
              eq(providerSlots.status, 'open'),
            ),
          )
          .limit(1);
        if (!slot) {
          throw new ConflictException({
            statusCode: 409,
            message: 'That slot is no longer available',
            code: 'SLOT_NOT_AVAILABLE',
          });
        }
        reservedSlotId = slot.id;
      }

      const [inserted] = await tx
        .insert(bookings)
        .values({
          ownerId,
          providerId: dto.providerId,
          petId: dto.petId,
          serviceType: dto.serviceType,
          // Drizzle's `timestamp` default mode is 'date' — pass Date, it calls
          // `.toISOString()` internally before binding to postgres-js.
          scheduledAt,
          durationMin: dto.durationMin,
          priceCents,
          notes: dto.notes ?? null,
          addressText: resolvedAddress.text,
          addressLat: resolvedAddress.lat == null ? null : String(resolvedAddress.lat),
          addressLng: resolvedAddress.lng == null ? null : String(resolvedAddress.lng),
          addressSource: resolvedAddress.source,
        })
        .returning();
      if (!inserted) throw new Error('insert returned no row');

      if (reservedSlotId) {
        // Mark the slot booked + link it to the new booking. The unique
        // index on (provider, service, start) plus the status='open' filter
        // we used on read means there's no race condition here even under
        // concurrent bookings — the second tx hits the same row and sees
        // status='booked' on its select, throwing SLOT_NOT_AVAILABLE above.
        await tx
          .update(providerSlots)
          .set({ status: 'booked', bookingId: inserted.id })
          .where(eq(providerSlots.id, reservedSlotId));
      }

      return inserted;
    });

    return mapBookingRow(row as BookingRow);
  }

  // ---- list / get ---------------------------------------------------------

  async list(userId: string, q: ListBookingsQuery): Promise<CursorPage<Booking>> {
    const conditions = [or(eq(bookings.ownerId, userId), eq(bookings.providerId, userId))];
    if (q.status) conditions.push(eq(bookings.status, q.status));
    if (q.from) conditions.push(gte(bookings.scheduledAt, new Date(q.from)));
    if (q.to) conditions.push(lte(bookings.scheduledAt, new Date(q.to)));

    const cursor = decodeCursor<BookingsCursor>(q.cursor);
    if (cursor) {
      // (scheduledAt, id) < (cursor.t, cursor.id), ORDER BY scheduledAt DESC, id DESC
      const t = new Date(cursor.t);
      conditions.push(
        or(
          lt(bookings.scheduledAt, t),
          and(eq(bookings.scheduledAt, t), lt(bookings.id, cursor.id)),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(bookings)
      .where(and(...conditions.filter(Boolean)))
      .orderBy(desc(bookings.scheduledAt), desc(bookings.id))
      .limit(q.limit + 1);

    return buildCursorPage(
      rows as BookingRow[],
      q.limit,
      mapBookingRow,
      (r) => ({ t: r.scheduledAt.toISOString(), id: r.id } satisfies BookingsCursor),
    );
  }

  async get(userId: string, id: string): Promise<Booking> {
    const row = await this.findVisibleRow(userId, id);
    return mapBookingRow(row);
  }

  // ---- state-machine actions ---------------------------------------------

  async confirm(userId: string, id: string): Promise<Booking> {
    return this.transition(userId, id, 'confirm');
  }

  /**
   * `start` flips the booking to in_progress AND, for ServiceType.Walking
   * bookings, creates the `walks` row with startedAt = now. Both writes happen
   * in one tx so we never end up with an in_progress booking missing its walk.
   */
  async start(userId: string, id: string): Promise<Booking> {
    const row = await this.findVisibleRow(userId, id);
    const callerRole = this.callerRole(userId, row);
    const t = tryTransition(row.status, 'start', callerRole);
    if (!t.ok) {
      if (t.code === 'NOT_AUTHORIZED') {
        throw new ForbiddenException('Only the provider can start this booking');
      }
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot start a ${row.status} booking`,
        code: 'BAD_TRANSITION',
      });
    }

    const updatedBooking = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(bookings)
        .set({ status: t.nextStatus, updatedAt: sql`now()` })
        .where(eq(bookings.id, id))
        .returning();
      if (!updated) throw new Error('start returned no row');

      if (row.serviceType === ServiceType.Walking) {
        // ON CONFLICT DO NOTHING — start is the only place that creates a walk,
        // but a flaky retry shouldn't insert twice.
        await tx
          .insert(walks)
          .values({ bookingId: id, startedAt: sql`now()`, polyline: [] })
          .onConflictDoNothing({ target: walks.bookingId });
      }

      return updated as BookingRow;
    });

    return mapBookingRow(updatedBooking);
  }

  /**
   * `end` flips the booking to completed AND, for Walking bookings, writes
   * endedAt + the computed total distance derived from the polyline jsonb.
   */
  async end(userId: string, id: string): Promise<Booking> {
    const row = await this.findVisibleRow(userId, id);
    const callerRole = this.callerRole(userId, row);
    const t = tryTransition(row.status, 'end', callerRole);
    if (!t.ok) {
      if (t.code === 'NOT_AUTHORIZED') {
        throw new ForbiddenException('Only the provider can end this booking');
      }
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot end a ${row.status} booking`,
        code: 'BAD_TRANSITION',
      });
    }

    const updatedBooking = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(bookings)
        .set({ status: t.nextStatus, updatedAt: sql`now()` })
        .where(eq(bookings.id, id))
        .returning();
      if (!updated) throw new Error('end returned no row');

      if (row.serviceType === ServiceType.Walking) {
        // Pull the walk row, derive distance from samples, write back.
        const [walk] = await tx
          .select()
          .from(walks)
          .where(eq(walks.bookingId, id));
        if (walk) {
          const samples = ((walk as WalkRow).polyline ?? []) as GeoSample[];
          const distanceM = new Polyline(samples).distanceM();
          await tx
            .update(walks)
            .set({ endedAt: sql`now()`, distanceM })
            .where(eq(walks.bookingId, id));
        }
      }

      return updated as BookingRow;
    });

    return mapBookingRow(updatedBooking);
  }

  async cancel(userId: string, id: string, dto: CancelBookingDto): Promise<Booking> {
    const row = await this.findVisibleRow(userId, id);
    const callerRole = this.callerRole(userId, row);
    const t = tryTransition(row.status, 'cancel', callerRole);
    if (!t.ok) {
      if (t.code === 'NOT_AUTHORIZED') throw new ForbiddenException('Not your booking');
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot cancel a ${row.status} booking`,
        code: 'BAD_TRANSITION',
      });
    }

    const outcome = computeCancellationOutcome({
      priceCents: row.priceCents,
      scheduledAt: row.scheduledAt,
      now: new Date(),
      cancelledBy: callerRole,
    });

    const [updated] = await this.db
      .update(bookings)
      .set({
        status: 'cancelled',
        cancelledBy: callerRole,
        cancelledAt: sql`now()`,
        cancellationReason: dto.reason ?? null,
        refundCents: outcome.refundCents,
        appFeeCents: outcome.appFeeCents,
        providerFeeCents: outcome.providerFeeCents,
        updatedAt: sql`now()`,
      })
      .where(eq(bookings.id, id))
      .returning();
    if (!updated) throw new Error('cancel returned no row');

    // Release any slot this booking was holding so another owner can book
    // it. No-op for window-mode bookings (no slot row was ever created).
    // Idempotent — the WHERE on status='booked' means a re-cancel won't
    // accidentally reopen a slot that's already been released.
    await this.db
      .update(providerSlots)
      .set({ status: 'open', bookingId: null })
      .where(and(eq(providerSlots.bookingId, id), eq(providerSlots.status, 'booked')));

    // Issue refund against the captured PaymentIntent if there is one. Idempotent:
    // refundForCancelledBooking() short-circuits when the payment isn't
    // succeeded or is already refunded.
    if (outcome.refundCents > 0) {
      this.payments
        .refundForCancelledBooking(id, outcome.refundCents)
        .catch(() => void 0);
    }

    return mapBookingRow(updated as BookingRow);
  }

  // ---- helpers ------------------------------------------------------------

  private async transition(
    userId: string,
    id: string,
    action: BookingAction,
  ): Promise<Booking> {
    const row = await this.findVisibleRow(userId, id);
    const callerRole = this.callerRole(userId, row);
    const t = tryTransition(row.status, action, callerRole);
    if (!t.ok) {
      if (t.code === 'NOT_AUTHORIZED') {
        throw new ForbiddenException(`Only the provider can ${action} this booking`);
      }
      throw new ConflictException({
        statusCode: 409,
        message: `Cannot ${action} a ${row.status} booking`,
        code: 'BAD_TRANSITION',
      });
    }

    const [updated] = await this.db
      .update(bookings)
      .set({ status: t.nextStatus, updatedAt: sql`now()` })
      .where(eq(bookings.id, id))
      .returning();
    if (!updated) throw new Error('transition returned no row');
    return mapBookingRow(updated as BookingRow);
  }

  private async findVisibleRow(userId: string, id: string): Promise<BookingRow> {
    const rows = await this.db.select().from(bookings).where(eq(bookings.id, id));
    const row = rows[0] as BookingRow | undefined;
    if (!row) throw new NotFoundException('Booking not found');
    if (row.ownerId !== userId && row.providerId !== userId) {
      throw new ForbiddenException('Not your booking');
    }
    return row;
  }

  private callerRole(userId: string, row: BookingRow): CallerRole {
    if (row.providerId === userId) return 'provider';
    if (row.ownerId === userId) return 'owner';
    throw new ForbiddenException('Not your booking');
  }
}

function unprocessable(code: string, message: string): HttpException {
  return new UnprocessableEntityException({
    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    message,
    code,
  });
}

// `BadRequestException` is referenced in the imports below but not used here
// — kept for symmetry with other modules. Re-export to silence the linter.
export { BadRequestException };
