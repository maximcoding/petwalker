import type { UserRow } from '../../db/schema/users.js';
import { mapAddressColumns } from '../../db/mappers/address.js';

import type { User } from '@petwalker/shared/types';

/**
 * Maps a DB row (Drizzle inferred shape, with Date / numeric-string columns)
 * to the API contract type from @petwalker/shared.
 *
 * Keep this here so the rest of the app deals only with `User`, never `UserRow`.
 */
export function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    cognitoSub: row.cognitoSub,
    email: row.email,
    role: row.role,
    fullName: row.fullName ?? null,
    phone: row.phone ?? null,
    avatarUrl: row.avatarUrl ?? null,
    address: mapAddressColumns(row.addressText, row.addressLat, row.addressLng),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
