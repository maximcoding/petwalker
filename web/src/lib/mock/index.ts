/**
 * Barrel for mock fixtures. Screens import via `@/lib/mock` rather
 * than reaching into individual files — keeps refactors safe.
 *
 * In M3 this layer is consumed directly by the UI (no HTTP). When
 * the real backend lands (M-Backend-handshake), screens stay the
 * same — only their react-query queries swap to hit /api/_mock/*
 * routes (gated by NEXT_PUBLIC_USE_MOCKS), which themselves still
 * read these fixtures.
 */

export { PROVIDERS, PROVIDER_BY_ID } from './providers';
export { PETS, PETS_BY_ID } from './pets';
export { BOOKINGS, BOOKINGS_BY_ID, upcomingBookings, recentlyBooked } from './bookings';
export { REVIEWS_BY_PROVIDER } from './reviews';
export {
  CATEGORY_LABELS,
  CATEGORY_HUE,
  ALL_CATEGORIES,
  type ServiceCategory,
  type BookingMode,
  type AccommodationKind,
  type MockProvider,
  type MockProviderService,
  type MockPet,
  type MockAddress,
  type MockReview,
  type MockBooking,
} from './types';
