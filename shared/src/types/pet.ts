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
  createdAt: ISODateString;
}
