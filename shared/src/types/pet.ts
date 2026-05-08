import type { Address } from './address.js';
import type { ISODateString, UUID } from './common.js';

export interface Pet {
  id: UUID;
  ownerId: UUID;
  name: string;
  species: string;
  breed?: string | null;
  weightKg?: number | null;
  ageYears?: number | null;
  notes?: string | null;
  photoUrl?: string | null;
  /** Optional per-pet address override. Falls back to the owner's user.address. */
  address: Address | null;
  createdAt: ISODateString;
}
