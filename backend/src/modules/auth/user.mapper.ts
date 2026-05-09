import { SUPPORTED_CURRENCIES } from '@petwalker/shared/types';

import { mapAddressColumns } from '../../db/mappers/address.js';
import type { UserRow } from '../../db/schema/users.js';

import type { SupportedCurrency, User } from '@petwalker/shared/types';

/**
 * `users.preferred_currency` is `text` in PG so its type widens to
 * `string`. The CHECK constraint added in 0013_user_about_currency.sql
 * keeps the column aligned with `SUPPORTED_CURRENCIES`, but we still
 * validate at read time so that anything that sneaks in (manual SQL,
 * stale column from a future migration) becomes `null` here instead of
 * leaking an unknown value into the API contract.
 */
function normalizeCurrency(raw: string | null): SupportedCurrency | null {
  if (raw == null) return null;
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(raw)
    ? (raw as SupportedCurrency)
    : null;
}

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
    aboutMe: row.aboutMe ?? null,
    preferredCurrency: normalizeCurrency(row.preferredCurrency),
    address: mapAddressColumns(row.addressText, row.addressLat, row.addressLng),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
