import { eq } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { mapAddressColumns } from '../../db/mappers/address.js';
import {
  pets,
  users,
  type ServiceOfferingRow,
} from '../../db/schema/index.js';

import type { AddressSource, CreateBookingDto } from '@petwalker/shared';

/** Resolved booking address — what we snapshot onto the bookings row. */
export interface ResolvedBookingAddress {
  text: string;
  lat: number | null;
  lng: number | null;
  source: AddressSource;
}

/**
 * Resolve the booking address from `dto.addressSource`.
 *
 * Fallback chain:
 *   - 'owner_pet'         → pet.address ?? owner.user.address
 *   - 'owner_user'        → owner.user.address (no fallback)
 *   - 'provider_offering' → offering.serviceAddress ?? provider.user.address
 *   - 'provider_user'     → provider.user.address (no fallback)
 *   - 'custom'            → dto.customAddress (required)
 *
 * Throws `Error` with a stable code-like message if the chain yields no
 * address — caller wraps as 422 UnprocessableEntity.
 */
export async function resolveBookingAddress(
  db: Database,
  ownerId: string,
  petId: string,
  offering: ServiceOfferingRow,
  dto: CreateBookingDto,
): Promise<ResolvedBookingAddress> {
  switch (dto.addressSource) {
    case 'custom': {
      if (!dto.customAddress) {
        throw new Error('CUSTOM_ADDRESS_REQUIRED');
      }
      return {
        text: dto.customAddress.text,
        lat: dto.customAddress.lat ?? null,
        lng: dto.customAddress.lng ?? null,
        source: 'custom',
      };
    }
    case 'owner_pet': {
      const [pet] = await db.select().from(pets).where(eq(pets.id, petId));
      const petAddr = pet
        ? mapAddressColumns(pet.addressText, pet.addressLat, pet.addressLng)
        : null;
      if (petAddr) return { ...petAddr, source: 'owner_pet' };
      const ownerAddr = await loadUserAddress(db, ownerId);
      if (!ownerAddr) throw new Error('OWNER_ADDRESS_MISSING');
      return { ...ownerAddr, source: 'owner_pet' };
    }
    case 'owner_user': {
      const ownerAddr = await loadUserAddress(db, ownerId);
      if (!ownerAddr) throw new Error('OWNER_ADDRESS_MISSING');
      return { ...ownerAddr, source: 'owner_user' };
    }
    case 'provider_offering': {
      const offAddr = mapAddressColumns(
        offering.serviceAddressText,
        offering.serviceAddressLat,
        offering.serviceAddressLng,
      );
      if (offAddr) return { ...offAddr, source: 'provider_offering' };
      const provAddr = await loadUserAddress(db, offering.providerId);
      if (!provAddr) throw new Error('PROVIDER_ADDRESS_MISSING');
      return { ...provAddr, source: 'provider_offering' };
    }
    case 'provider_user': {
      const provAddr = await loadUserAddress(db, offering.providerId);
      if (!provAddr) throw new Error('PROVIDER_ADDRESS_MISSING');
      return { ...provAddr, source: 'provider_user' };
    }
  }
  // Exhaustiveness — TS will flag if a new AddressSource is added.
  const _exhaustive: never = dto.addressSource;
  void _exhaustive;
  throw new Error('UNKNOWN_ADDRESS_SOURCE');
}

async function loadUserAddress(
  db: Database,
  userId: string,
): Promise<{ text: string; lat: number | null; lng: number | null } | null> {
  const [user] = await db
    .select({
      addressText: users.addressText,
      addressLat: users.addressLat,
      addressLng: users.addressLng,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return null;
  return mapAddressColumns(user.addressText, user.addressLat, user.addressLng);
}
