import type { UserRole } from '../enums/user-role.js';

import type { Address } from './address.js';
import type { ISODateString, UUID } from './common.js';

export interface User {
  id: UUID;
  cognitoSub: string;
  email: string;
  role: UserRole;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  /** Default home address. Owners use as booking pickup; providers use as default service location. */
  address: Address | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// `WalkerProfile` and `WalkerListing` were renamed to ServiceProviderProfile / ServiceProviderListing
// and moved to `./service-provider.ts`. See enums/service-type for the multi-service catalog.
