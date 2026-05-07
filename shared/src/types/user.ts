import type { UserRole } from '../enums/user-role.js';

import type { ISODateString, UUID } from './common.js';

export interface User {
  id: UUID;
  cognitoSub: string;
  email: string;
  role: UserRole;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// `WalkerProfile` and `WalkerListing` were renamed to ServiceProviderProfile / ServiceProviderListing
// and moved to `./service-provider.ts`. See enums/service-type for the multi-service catalog.
