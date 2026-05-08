import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  providerAvailability,
  providerServiceOfferings,
  serviceProviderProfiles,
  users,
  type ProviderAvailabilityRow,
  type ServiceOfferingRow,
  type ServiceProviderProfileRow,
  type UserRow,
} from '../../db/schema/index.js';
import { mapUserRow } from '../auth/user.mapper.js';
import { SlotGeneratorService } from '../providers/slot-generator.service.js';

import { mapServiceOfferingRow } from './service-offering.mapper.js';
import { mapServiceProviderProfileRow } from './service-provider-profile.mapper.js';

import {
  DEFAULT_BOOKING_MODE,
  DEFAULT_SLOT_DURATION_MIN,
  DEFAULT_SUPPORTED_SOURCES,
} from '@petwalker/shared/enums';

import type {
  ReplaceAvailabilityDto,
  UpdateUserDto,
  UpsertServiceOfferingDto,
  UpsertServiceProviderProfileDto,
} from '@petwalker/shared/dto';
import type { ServiceType } from '@petwalker/shared/enums';
import type {
  AvailabilitySlot,
  ServiceOffering,
  ServiceProviderProfile,
  User,
} from '@petwalker/shared/types';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @Inject(SlotGeneratorService) private readonly slots: SlotGeneratorService,
  ) {}

  async updateMe(userId: string, dto: UpdateUserDto): Promise<User> {
    // `address: null` clears, object overwrites, undefined leaves untouched.
    const addressUpdate =
      dto.address === undefined
        ? {}
        : dto.address === null
          ? { addressText: null, addressLat: null, addressLng: null }
          : {
              addressText: dto.address.text,
              addressLat: dto.address.lat == null ? null : String(dto.address.lat),
              addressLng: dto.address.lng == null ? null : String(dto.address.lng),
            };

    const [updated] = await this.db
      .update(users)
      .set({
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone ?? null } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl ?? null } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...addressUpdate,
        updatedAt: sql`now()`,
      })
      .where(eq(users.id, userId))
      .returning();
    if (!updated) throw new NotFoundException('User not found');
    return mapUserRow(updated as UserRow);
  }

  // ---- service-provider profile (one row per provider) ----------------

  async getServiceProfile(userId: string): Promise<ServiceProviderProfile | null> {
    const rows = await this.db
      .select()
      .from(serviceProviderProfiles)
      .where(eq(serviceProviderProfiles.userId, userId));
    return rows[0] ? mapServiceProviderProfileRow(rows[0] as ServiceProviderProfileRow) : null;
  }

  async upsertServiceProfile(
    userId: string,
    dto: UpsertServiceProviderProfileDto,
  ): Promise<ServiceProviderProfile> {
    const values = {
      userId,
      ...(dto.bio !== undefined ? { bio: dto.bio ?? null } : {}),
      ...(dto.serviceRadiusKm !== undefined
        ? { serviceRadiusKm: String(dto.serviceRadiusKm) }
        : {}),
      ...(dto.baseLat !== undefined
        ? { baseLat: dto.baseLat == null ? null : String(dto.baseLat) }
        : {}),
      ...(dto.baseLng !== undefined
        ? { baseLng: dto.baseLng == null ? null : String(dto.baseLng) }
        : {}),
    };

    // Build the SET clause by stripping userId; if nothing else is changing,
    // fall back to onConflictDoNothing + a re-select so we never send an
    // empty SET clause (which Postgres rejects with "No values to set").
    const setClause = { ...values } as Record<string, unknown>;
    delete setClause.userId;
    const hasUpdates = Object.keys(setClause).length > 0;

    const insertQ = this.db.insert(serviceProviderProfiles).values(values);
    const [row] = await (hasUpdates
      ? insertQ
          .onConflictDoUpdate({
            target: serviceProviderProfiles.userId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            set: setClause as any,
          })
          .returning()
      : insertQ.onConflictDoNothing().returning());

    if (row) return mapServiceProviderProfileRow(row as ServiceProviderProfileRow);

    // onConflictDoNothing path skipped insert because the row already exists —
    // re-select it.
    const existing = await this.getServiceProfile(userId);
    if (!existing) throw new Error('upsert returned no row');
    return existing;
  }

  // ---- per-service offerings (price-per-service) ----------------------

  async listMyOfferings(userId: string): Promise<ServiceOffering[]> {
    const rows = await this.db
      .select()
      .from(providerServiceOfferings)
      .where(eq(providerServiceOfferings.providerId, userId));
    return rows.map((r) => mapServiceOfferingRow(r as ServiceOfferingRow));
  }

  async upsertOffering(
    userId: string,
    dto: UpsertServiceOfferingDto,
  ): Promise<ServiceOffering> {
    // Provider must have a service profile first — implicitly created with defaults.
    await this.upsertServiceProfile(userId, {});

    // Defaults derived from the service type the very first time this
    // (provider × service) is upserted. Subsequent upserts respect the DB's
    // current value via COALESCE-on-update — see set:{} below.
    const bookingMode = dto.bookingMode ?? DEFAULT_BOOKING_MODE[dto.serviceType];
    const slotDurationMin =
      dto.slotDurationMin ?? DEFAULT_SLOT_DURATION_MIN[dto.serviceType];
    const defaultSupported = DEFAULT_SUPPORTED_SOURCES[dto.serviceType];
    const supports = dto.supportedSources ?? defaultSupported;

    const [row] = await this.db
      .insert(providerServiceOfferings)
      .values({
        providerId: userId,
        serviceType: dto.serviceType,
        hourlyRateCents: dto.hourlyRateCents,
        active: dto.active,
        bookingMode,
        slotDurationMin,
        supportsOwnerLocation: supports.owner,
        supportsProviderLocation: supports.provider,
        supportsCustomLocation: supports.custom,
        ...(dto.addressDefault != null ? { addressDefault: dto.addressDefault } : {}),
        ...(dto.serviceAddress !== undefined
          ? dto.serviceAddress === null
            ? {
                serviceAddressText: null,
                serviceAddressLat: null,
                serviceAddressLng: null,
              }
            : {
                serviceAddressText: dto.serviceAddress.text,
                serviceAddressLat:
                  dto.serviceAddress.lat == null ? null : String(dto.serviceAddress.lat),
                serviceAddressLng:
                  dto.serviceAddress.lng == null ? null : String(dto.serviceAddress.lng),
              }
          : {}),
      })
      .onConflictDoUpdate({
        target: [providerServiceOfferings.providerId, providerServiceOfferings.serviceType],
        // Only overwrite booking-mode / slot-duration / address when the
        // caller actually sent them. Otherwise existing rows keep their
        // settings even when a price-only edit comes through.
        set: {
          hourlyRateCents: dto.hourlyRateCents,
          active: dto.active,
          ...(dto.bookingMode != null ? { bookingMode: dto.bookingMode } : {}),
          ...(dto.slotDurationMin != null
            ? { slotDurationMin: dto.slotDurationMin }
            : {}),
          ...(dto.addressDefault != null ? { addressDefault: dto.addressDefault } : {}),
          ...(dto.supportedSources != null
            ? {
                supportsOwnerLocation: dto.supportedSources.owner,
                supportsProviderLocation: dto.supportedSources.provider,
                supportsCustomLocation: dto.supportedSources.custom,
              }
            : {}),
          ...(dto.serviceAddress !== undefined
            ? dto.serviceAddress === null
              ? {
                  serviceAddressText: null,
                  serviceAddressLat: null,
                  serviceAddressLng: null,
                }
              : {
                  serviceAddressText: dto.serviceAddress.text,
                  serviceAddressLat:
                    dto.serviceAddress.lat == null ? null : String(dto.serviceAddress.lat),
                  serviceAddressLng:
                    dto.serviceAddress.lng == null ? null : String(dto.serviceAddress.lng),
                }
            : {}),
        },
      })
      .returning();
    if (!row) throw new Error('upsert returned no row');

    // If the saved offering is in slot mode, materialize the next 90 days of
    // slots from the weekly availability template. Idempotent — re-saving an
    // offering twice doesn't duplicate slot rows.
    if (row.bookingMode === 'slot' && row.active) {
      try {
        await this.slots.generate(userId, dto.serviceType);
      } catch (err) {
        // Non-fatal: the offering save succeeded. Provider can re-trigger
        // via "Publish slots now" if generation hiccupped.
        // eslint-disable-next-line no-console
        console.warn('[upsertOffering] slot generate failed:', (err as Error).message);
      }
    }

    return mapServiceOfferingRow(row as ServiceOfferingRow);
  }

  /**
   * Manual trigger for slot publication — used by the "Publish slots now"
   * button. Returns the count of new slots inserted.
   */
  async publishSlots(userId: string, serviceType: ServiceType): Promise<number> {
    return this.slots.generate(userId, serviceType);
  }

  async removeOffering(userId: string, serviceType: ServiceType): Promise<void> {
    await this.db
      .delete(providerServiceOfferings)
      .where(
        and(
          eq(providerServiceOfferings.providerId, userId),
          eq(providerServiceOfferings.serviceType, serviceType),
        ),
      );
  }

  // ---- weekly availability (UTC) --------------------------------------

  async getAvailability(userId: string): Promise<AvailabilitySlot[]> {
    const rows = await this.db
      .select()
      .from(providerAvailability)
      .where(eq(providerAvailability.providerId, userId))
      .orderBy(providerAvailability.dayOfWeek, providerAvailability.startTime);
    return rows.map((r) => mapAvailabilityRow(r as ProviderAvailabilityRow));
  }

  async replaceAvailability(
    userId: string,
    dto: ReplaceAvailabilityDto,
  ): Promise<AvailabilitySlot[]> {
    // Provider profile must exist (we silently bootstrap it).
    await this.upsertServiceProfile(userId, {});

    await this.db.transaction(async (tx) => {
      await tx.delete(providerAvailability).where(eq(providerAvailability.providerId, userId));
      if (dto.slots.length > 0) {
        await tx.insert(providerAvailability).values(
          dto.slots.map((s) => ({
            providerId: userId,
            dayOfWeek: s.dayOfWeek,
            startTime: `${s.startTime}:00`,
            endTime: `${s.endTime}:00`,
          })),
        );
      }
    });

    return this.getAvailability(userId);
  }
}

function mapAvailabilityRow(row: ProviderAvailabilityRow): AvailabilitySlot {
  // Postgres returns 'HH:MM:SS'; UI works with 'HH:MM'.
  return {
    dayOfWeek: row.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    startTime: row.startTime.slice(0, 5),
    endTime: row.endTime.slice(0, 5),
  };
}
