import type { ServiceType } from '../enums/service-type.js';

import type { ISODateString, UUID } from './common.js';

/** Provider's general profile — bio, base location, service radius, verified status. */
export interface ServiceProviderProfile {
  userId: UUID;
  bio?: string | null;
  serviceRadiusKm: number;
  baseLat?: number | null;
  baseLng?: number | null;
  verifiedAt?: ISODateString | null;
}

/** A single service the provider offers, with its own price. */
export interface ServiceOffering {
  providerId: UUID;
  serviceType: ServiceType;
  hourlyRateCents: number;
  active: boolean;
}

/** A provider as exposed to owners in search results. */
export interface ServiceProviderListing {
  userId: UUID;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  baseLat?: number | null;
  baseLng?: number | null;
  serviceRadiusKm: number;
  rating?: number | null;
  reviewCount: number;
  verified: boolean;
  /** Distance from the search origin (metres). Always populated by the search endpoint. */
  distanceM: number;
  /** Offerings filtered to the requested serviceType (always non-empty in search results). */
  offerings: ServiceOffering[];
}

/** Full profile view — used by `/providers/:id` (no search context, so no distance). */
export interface ServiceProviderDetail {
  userId: UUID;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  baseLat?: number | null;
  baseLng?: number | null;
  serviceRadiusKm: number;
  rating?: number | null;
  reviewCount: number;
  verified: boolean;
  /** All active offerings for this provider. */
  offerings: ServiceOffering[];
}
