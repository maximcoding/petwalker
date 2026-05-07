import type { PetRow } from '../../db/schema/pets.js';

import type { Pet } from '@petwalker/shared/types';

export function mapPetRow(row: PetRow): Pet {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    species: row.species,
    breed: row.breed ?? null,
    weightKg: row.weightKg == null ? null : Number(row.weightKg),
    ageYears: row.ageYears == null ? null : Number(row.ageYears),
    notes: row.notes ?? null,
    photoUrl: row.photoUrl ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
