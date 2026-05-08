import {
  ForbiddenException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, gt, inArray, sql } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  bookings,
  pets,
  providerServiceOfferings,
  providerSlots,
  recurringSeries,
  type BookingRow,
  type RecurringSeriesRow,
} from '../../db/schema/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';

import { resolveBookingAddress } from './address-resolver.js';
import { hasAvailability, hasExternalBusyConflict, hasOverlap } from './availability-check.js';
import { mapBookingRow } from './booking.mapper.js';
import { addWeeks, generateRecurrenceDates } from './recurrence-dates.js';

import type {
  Booking,
  CancelBookingDto,
  CreateRecurringSeriesDto,
  CreateRecurringSeriesResponse,
  RecurringSeries,
} from '@petwalker/shared';

function mapSeriesRow(row: RecurringSeriesRow): RecurringSeries {
  return {
    id: row.id,
    ownerId: row.ownerId,
    providerId: row.providerId,
    petId: row.petId,
    serviceType: row.serviceType as never,
    recurrence: row.recurrence,
    daysOfWeek: JSON.parse(row.daysOfWeek) as number[],
    timeOfDay: row.timeOfDay,
    startDate: row.startDate,
    endDate: row.endDate,
    durationMin: row.durationMin,
    priceCents: row.priceCents,
    notes: row.notes ?? null,
    instanceCount: row.instanceCount,
    cancelledAt: row.cancelledAt ? (row.cancelledAt instanceof Date ? row.cancelledAt.toISOString() : String(row.cancelledAt)) : null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

@Injectable()
export class RecurringSeriesService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async create(
    ownerId: string,
    dto: CreateRecurringSeriesDto,
  ): Promise<CreateRecurringSeriesResponse> {
    const [pet] = await this.db.select().from(pets).where(eq(pets.id, dto.petId)).limit(1);
    if (!pet) throw new NotFoundException('Pet not found');
    if (pet.ownerId !== ownerId) throw new ForbiddenException('Not your pet');

    const [offering] = await this.db
      .select()
      .from(providerServiceOfferings)
      .where(
        and(
          eq(providerServiceOfferings.providerId, dto.providerId),
          eq(providerServiceOfferings.serviceType, dto.serviceType),
          eq(providerServiceOfferings.active, true),
        ),
      )
      .limit(1);
    if (!offering) {
      throw unprocessable('PROVIDER_NO_OFFERING', 'Provider does not offer this service');
    }

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

    let resolvedAddress;
    try {
      resolvedAddress = await resolveBookingAddress(
        this.db,
        ownerId,
        dto.petId,
        offering,
        dto as never,
      );
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

    const priceCents = Math.round(offering.hourlyRateCents * (dto.durationMin / 60));

    const endDate = dto.endDate ?? addWeeks(dto.startDate, 12);
    const dates = generateRecurrenceDates({
      recurrence: dto.recurrence,
      daysOfWeek: dto.daysOfWeek,
      timeOfDay: dto.timeOfDay,
      startDate: dto.startDate,
      endDate,
    });
    if (dates.length === 0) {
      throw unprocessable('NO_INSTANCES', 'The recurrence pattern produces no bookings in the date range');
    }

    const now = new Date();
    const minGrace = now.getTime() + 5 * 60_000;
    const unavailableDates: string[] = [];
    for (const scheduledAt of dates) {
      if (scheduledAt.getTime() < minGrace) {
        unavailableDates.push(scheduledAt.toISOString());
        continue;
      }
      const end = new Date(scheduledAt.getTime() + dto.durationMin * 60_000);
      const [avail, overlap, externalBusy] = await Promise.all([
        hasAvailability(this.db, dto.providerId, scheduledAt, dto.durationMin),
        hasOverlap(this.db, dto.providerId, scheduledAt, end),
        hasExternalBusyConflict(this.db, dto.providerId, scheduledAt, end),
      ]);
      if (!avail || overlap || externalBusy) {
        unavailableDates.push(scheduledAt.toISOString());
      }
    }
    if (unavailableDates.length > 0) {
      throw new UnprocessableEntityException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: `${unavailableDates.length} instance(s) are not available`,
        code: 'INSTANCES_UNAVAILABLE',
        data: { unavailableDates },
      });
    }

    const { seriesRow, bookingRows } = await this.db.transaction(async (tx) => {
      const [seriesRow] = await tx
        .insert(recurringSeries)
        .values({
          ownerId,
          providerId: dto.providerId,
          petId: dto.petId,
          serviceType: dto.serviceType,
          recurrence: dto.recurrence,
          daysOfWeek: JSON.stringify(dto.daysOfWeek),
          timeOfDay: dto.timeOfDay,
          startDate: dto.startDate,
          endDate,
          durationMin: dto.durationMin,
          priceCents,
          notes: dto.notes ?? null,
          addressText: resolvedAddress.text,
          addressLat: resolvedAddress.lat == null ? null : String(resolvedAddress.lat),
          addressLng: resolvedAddress.lng == null ? null : String(resolvedAddress.lng),
          addressSource: resolvedAddress.source,
          instanceCount: dates.length,
        })
        .returning();
      if (!seriesRow) throw new Error('series insert returned no row');

      const bookingRows = await tx
        .insert(bookings)
        .values(
          dates.map((scheduledAt) => ({
            ownerId,
            providerId: dto.providerId,
            petId: dto.petId,
            serviceType: dto.serviceType,
            scheduledAt,
            durationMin: dto.durationMin,
            priceCents,
            notes: dto.notes ?? null,
            addressText: resolvedAddress.text,
            addressLat: resolvedAddress.lat == null ? null : String(resolvedAddress.lat),
            addressLng: resolvedAddress.lng == null ? null : String(resolvedAddress.lng),
            addressSource: resolvedAddress.source,
            recurringSeriesId: seriesRow.id,
          })),
        )
        .returning();

      return { seriesRow, bookingRows };
    });

    this.notifications.notifyAsync({
      recipientUserId: dto.providerId,
      eventType: 'booking.confirmed',
      title: 'New recurring booking series!',
      body: `A client has set up ${dates.length} recurring ${dto.serviceType} sessions.`,
      deepLink: `petwalker://bookings`,
    });

    return {
      series: mapSeriesRow(seriesRow as RecurringSeriesRow),
      bookings: (bookingRows as BookingRow[]).map(mapBookingRow),
    };
  }

  async get(userId: string, id: string): Promise<RecurringSeries> {
    const [row] = await this.db
      .select()
      .from(recurringSeries)
      .where(eq(recurringSeries.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Series not found');
    const r = row as RecurringSeriesRow;
    if (r.ownerId !== userId && r.providerId !== userId) {
      throw new ForbiddenException('Not your series');
    }
    return mapSeriesRow(r);
  }

  async cancelRemaining(
    userId: string,
    seriesId: string,
    dto: CancelBookingDto,
  ): Promise<{ cancelledCount: number }> {
    const [row] = await this.db
      .select()
      .from(recurringSeries)
      .where(eq(recurringSeries.id, seriesId))
      .limit(1);
    if (!row) throw new NotFoundException('Series not found');
    const r = row as RecurringSeriesRow;
    if (r.ownerId !== userId && r.providerId !== userId) {
      throw new ForbiddenException('Not your series');
    }

    const callerRole = r.providerId === userId ? 'provider' : 'owner';
    const now = new Date();

    const toCancel = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.recurringSeriesId, seriesId),
          inArray(bookings.status, ['pending', 'confirmed']),
          gt(bookings.scheduledAt, now),
        ),
      );

    if (toCancel.length === 0) {
      return { cancelledCount: 0 };
    }

    const ids = toCancel.map((b) => b.id);

    await this.db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: 'cancelled',
          cancelledBy: callerRole,
          cancelledAt: sql`now()`,
          cancellationReason: dto.reason ?? null,
          updatedAt: sql`now()`,
        })
        .where(inArray(bookings.id, ids));

      await tx
        .update(providerSlots)
        .set({ status: 'open', bookingId: null })
        .where(
          and(
            inArray(providerSlots.bookingId, ids),
            eq(providerSlots.status, 'booked'),
          ),
        );

      await tx
        .update(recurringSeries)
        .set({ cancelledAt: sql`now()`, cancelledBy: callerRole })
        .where(eq(recurringSeries.id, seriesId));
    });

    const notifyId = callerRole === 'provider' ? r.ownerId : r.providerId;
    this.notifications.notifyAsync({
      recipientUserId: notifyId,
      eventType: 'booking.cancelled',
      title: 'Recurring series cancelled',
      body: `${toCancel.length} upcoming session(s) in a recurring series were cancelled.`,
      deepLink: `petwalker://bookings`,
    });

    return { cancelledCount: ids.length };
  }
}

function unprocessable(code: string, message: string): UnprocessableEntityException {
  return new UnprocessableEntityException({
    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    message,
    code,
  });
}
