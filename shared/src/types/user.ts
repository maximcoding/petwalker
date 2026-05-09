import type { UserRole } from '../enums/user-role.js';

import type { Address } from './address.js';
import type { ISODateString, UUID } from './common.js';

/**
 * Currencies the platform supports today. Stored as ISO-4217 codes; the
 * `Money` class (shared/classes/money.ts) already accepts arbitrary 3-letter
 * codes so this list is just the user-selectable set.
 *
 * Add a code here AND backfill it in the `users.preferred_currency` CHECK
 * constraint (backend/drizzle/migrations) when expanding the catalog.
 */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'ILS'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface User {
  id: UUID;
  cognitoSub: string;
  email: string;
  role: UserRole;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  /**
   * Free-form bio shown on the user's profile and (for providers) on the
   * provider listing card. Capped at ~600 chars by the DTO; null when the
   * user hasn't written one yet.
   */
  aboutMe?: string | null;
  /**
   * User's preferred display currency for prices and invoices. Null until
   * the user picks one — the UI falls back to USD in that case.
   */
  preferredCurrency?: SupportedCurrency | null;
  /** Default home address. Owners use as booking pickup; providers use as default service location. */
  address: Address | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// `WalkerProfile` and `WalkerListing` were renamed to ServiceProviderProfile / ServiceProviderListing
// and moved to `./service-provider.ts`. See enums/service-type for the multi-service catalog.
