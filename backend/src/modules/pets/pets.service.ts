import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, lt, or } from 'drizzle-orm';

import { decodeCursor } from '../../common/cursor.js';
import { buildCursorPage } from '../../common/pagination.js';
import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import { pets, type PetRow } from '../../db/schema/index.js';

import { mapPetRow } from './pet.mapper.js';

import type { CreatePetDto, ListPetsQuery, UpdatePetDto } from '@petwalker/shared/dto';
import type { CursorPage, Pet } from '@petwalker/shared/types';

interface PetsCursor {
  /** createdAt ISO of the last item on the previous page. */
  t: string;
  id: string;
}

@Injectable()
export class PetsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async listMine(ownerId: string, q: ListPetsQuery): Promise<CursorPage<Pet>> {
    const conditions = [eq(pets.ownerId, ownerId)];

    const cursor = decodeCursor<PetsCursor>(q.cursor);
    if (cursor) {
      const t = new Date(cursor.t);
      conditions.push(
        or(
          lt(pets.createdAt, t),
          and(eq(pets.createdAt, t), lt(pets.id, cursor.id)),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(pets)
      .where(and(...conditions))
      .orderBy(desc(pets.createdAt), desc(pets.id))
      .limit(q.limit + 1);

    return buildCursorPage(
      rows as PetRow[],
      q.limit,
      mapPetRow,
      (r) => ({ t: r.createdAt.toISOString(), id: r.id } satisfies PetsCursor),
    );
  }

  async getOwned(ownerId: string, id: string): Promise<Pet> {
    const row = await this.findOwnedRow(ownerId, id);
    return mapPetRow(row);
  }

  async create(ownerId: string, dto: CreatePetDto): Promise<Pet> {
    const [row] = await this.db
      .insert(pets)
      .values({
        ownerId,
        name: dto.name,
        species: dto.species,
        breed: dto.breed ?? null,
        weightKg: dto.weightKg == null ? null : String(dto.weightKg),
        ageYears: dto.ageYears == null ? null : String(dto.ageYears),
        notes: dto.notes ?? null,
        photoUrl: dto.photoUrl ?? null,
      })
      .returning();
    if (!row) throw new Error('insert returned no row');
    return mapPetRow(row as PetRow);
  }

  async update(ownerId: string, id: string, dto: UpdatePetDto): Promise<Pet> {
    await this.findOwnedRow(ownerId, id); // throws if missing or not owned

    const [row] = await this.db
      .update(pets)
      .set({
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.species !== undefined ? { species: dto.species } : {}),
        ...(dto.breed !== undefined ? { breed: dto.breed ?? null } : {}),
        ...(dto.weightKg !== undefined
          ? { weightKg: dto.weightKg == null ? null : String(dto.weightKg) }
          : {}),
        ...(dto.ageYears !== undefined
          ? { ageYears: dto.ageYears == null ? null : String(dto.ageYears) }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
        ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl ?? null } : {}),
      })
      .where(eq(pets.id, id))
      .returning();
    if (!row) throw new Error('update returned no row');
    return mapPetRow(row as PetRow);
  }

  async delete(ownerId: string, id: string): Promise<void> {
    await this.findOwnedRow(ownerId, id);
    await this.db.delete(pets).where(eq(pets.id, id));
  }

  /** Returns the row only if it exists AND belongs to the caller. */
  private async findOwnedRow(ownerId: string, id: string): Promise<PetRow> {
    const rows = await this.db.select().from(pets).where(eq(pets.id, id));
    const row = rows[0] as PetRow | undefined;
    if (!row) throw new NotFoundException('Pet not found');
    if (row.ownerId !== ownerId) throw new ForbiddenException('Not your pet');
    return row;
  }
}
