import type { BookingMode } from '../enums/booking-mode.js';
import type { ServiceType } from '../enums/service-type.js';

import type { Address, AddressDefault, SupportedAddressSources } from './address.js';
import type { AvailabilitySlot } from './availability.js';
import type { ISODateString, UUID } from './common.js';

/** Provider's general profile — bio, base location, service radius, verified status. */
export interface ServiceProviderProfile {
  userId: UUID;
  bio?: string | null;
  serviceRadiusKm: number;
  baseLat?: number | null;
  baseLng?: number | null;
  /** Display-only label rendered on the card / detail header, e.g. "Brooklyn". */
  baseCity?: string | null;
  /** Year the provider started doing this professionally — surfaces as "Walking since 2018". */
  experienceSinceYear?: number | null;
  verifiedAt?: ISODateString | null;
}

/** A single service the provider offers, with its own price + booking style. */
export interface ServiceOffering {
  providerId: UUID;
  serviceType: ServiceType;
  hourlyRateCents: number;
  active: boolean;
  /** How owners book this offering (window vs slot). Defaulted by service type. */
  bookingMode: BookingMode;
  /**
   * For slot mode: the duration of one bookable slot in minutes (e.g. 30
   * for vet appointments). Ignored in window mode but still stored as a
   * hint for owners and as a default if mode is later switched.
   */
  slotDurationMin: number;
  /** Per-offering service location override. Falls back to provider.user.address. */
  serviceAddress: Address | null;
  /**
   * Deprecated — kept in the API contract for backward compat; new code
   * should read `supportedSources` instead. Removable once mobile + web
   * have caught up.
   */
  addressDefault: AddressDefault;
  /** Allow-list of address sources the provider supports for this offering. */
  supportedSources: SupportedAddressSources;
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
  /** Display-only label rendered as a chip on the card. */
  baseCity?: string | null;
  /** Year the provider started professionally — chip "Walking since 2018". */
  experienceSinceYear?: number | null;
  /** When the user first signed up — chip "Member since Mar 2024". */
  registeredAt: ISODateString;
  /** Average of all reviews for this provider, null when no reviews exist. */
  rating?: number | null;
  reviewCount: number;
  verified: boolean;
  /** Distance from the search origin (metres). Always populated by the search endpoint. */
  distanceM: number;
  /** Offerings filtered to the requested serviceType (always non-empty in search results). */
  offerings: ServiceOffering[];
  /** True iff the calling owner has favorited this provider. */
  isFavorited: boolean;
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
  /** Display-only label rendered as a chip on the card. */
  baseCity?: string | null;
  /** Year the provider started professionally — chip "Walking since 2018". */
  experienceSinceYear?: number | null;
  /** When the user first signed up — chip "Member since Mar 2024". */
  registeredAt: ISODateString;
  /** Average of all reviews for this provider, null when no reviews exist. */
  rating?: number | null;
  reviewCount: number;
  verified: boolean;
  /** All active offerings for this provider. */
  offerings: ServiceOffering[];
  /** Weekly availability slots (UTC). Empty means provider has set no schedule. */
  availability: AvailabilitySlot[];
  /** True iff the calling owner has favorited this provider. */
  isFavorited: boolean;
}
