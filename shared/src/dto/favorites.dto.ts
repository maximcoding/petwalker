import { z } from 'zod';

/**
 * Cursor-paginated query for `GET /me/favorites`. Mirrors the shape of
 * `ListPetsQuery` — opaque cursor + bounded limit. The default of 30 keeps
 * the listing snappy on slow networks while still feeling like "all of
 * them" for typical owner usage.
 */
export const ListFavoritesQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type ListFavoritesQuery = z.infer<typeof ListFavoritesQuery>;
