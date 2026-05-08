/**
 * A free-form address with optional geocoded coordinates.
 *
 * `text` is the human-readable address as the user typed it (e.g.
 * "12 Main St, Brooklyn, NY 11201"). `lat`/`lng` are optional decimal
 * degrees — populated when the user pastes coordinates or when a future
 * geocoder runs. We never auto-geocode in v1; bookings work fine without
 * coordinates as long as the text is unambiguous to a human.
 *
 * Stored across three flat columns in DB so we can index/sort by lat/lng
 * without unwrapping JSON. Mappers compose this type from those columns.
 */
export interface Address {
  text: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Where a booking's address came from at create time. Captured on the
 * booking row so renaming or moving the source address later doesn't
 * rewrite history.
 */
export type AddressSource =
  | 'owner_user'
  | 'owner_pet'
  | 'provider_user'
  | 'provider_offering'
  | 'custom';

/** Default booking-address source for an offering. Owners can override at book-time. */
export type AddressDefault = 'owner' | 'provider' | 'either';
