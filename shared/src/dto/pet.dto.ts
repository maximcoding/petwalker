import { z } from 'zod';

export const CreatePetDto = z.object({
  name: z.string().min(1).max(80),
  species: z.string().min(1).max(40).default('dog'),
  breed: z.string().max(80).nullable().optional(),
  weightKg: z.number().positive().max(200).nullable().optional(),
  ageYears: z.number().nonnegative().max(40).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
});
export type CreatePetDto = z.infer<typeof CreatePetDto>;

export const UpdatePetDto = CreatePetDto.partial();
export type UpdatePetDto = z.infer<typeof UpdatePetDto>;

export const ListPetsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type ListPetsQuery = z.infer<typeof ListPetsQuery>;
