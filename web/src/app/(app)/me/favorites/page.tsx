import { redirect } from 'next/navigation';

/**
 * Legacy `/me/favorites` route. The IA refactor promoted Favorites to a
 * top-level route at `/favorites`. This file is kept as a server-side
 * redirect for any cached bookmarks; remove it once analytics show no
 * traffic.
 */
export default function LegacyFavoritesPage(): never {
  redirect('/favorites');
}
