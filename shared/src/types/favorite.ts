import type { ISODateString, UUID } from './common.js';

/** A row in the user_favorites table — owner ↔ provider association. */
export interface Favorite {
  providerId: UUID;
  createdAt: ISODateString;
}

/** Toggle response — backend returns the new state so the UI doesn't drift. */
export interface FavoriteToggleResult {
  favorited: boolean;
}
