import type { Address } from '@petwalker/shared/types';

/**
 * Compose an `Address` from the three flat DB columns (text + numeric lat/lng).
 *
 * Returns `null` if `text` is null/empty — that's the "no address set"
 * signal across users/pets/offerings. Callers don't need to special-case
 * the missing-text case.
 *
 * postgres-js returns `numeric` columns as strings; we coerce to `number`
 * here so the API contract always matches `Address.lat: number | null`.
 */
export function mapAddressColumns(
  text: string | null | undefined,
  lat: string | number | null | undefined,
  lng: string | number | null | undefined,
): Address | null {
  if (text == null || text === '') return null;
  return {
    text,
    lat: lat == null ? null : Number(lat),
    lng: lng == null ? null : Number(lng),
  };
}
