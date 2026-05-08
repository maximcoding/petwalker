import { eq } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { mapAddressColumns } from '../../db/mappers/address.js';
import {
  pets,
  providerServiceOfferings,
  users,
  type ServiceOfferingRow,
} from '../../db/schema/index.js';

import type { AddressSource, CreateBookingDto } from '@petwalker/shared';

/**
 * Resolved booking address — what we snapshot onto the bookings row.
 * Always returns a non-empty `text`; the resolver throws if the chosen
 * source has no address set.
 */
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
 *   - 'custom'            → dto.customAddress (required when this source
 *                           is chosen — caller validates separately to
 *                           keep this function pure)
 *
 * Throws `Error` with a stable code-like message if the chain yields no
 * address — caller wraps as 422 UnprocessableEntity. Returning a discrim
 * union of error vs ok was overkill for the four call sites.
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
      // Fallback to owner's user.address.
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
  // Exhaustiveness: discriminated union ensures the cases above cover all
  // possibilities. If we ever add a new AddressSource, TS will flag this.
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
  const addr = mapAddressColumns(user.addressText, user.addressLat, user.addressLng);
  return addr;
}
