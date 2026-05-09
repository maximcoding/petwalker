import { redirect } from 'next/navigation';

/**
 * Legacy `/me` route. The IA refactor consolidated personal identity into
 * the avatar-based `UserMenu` and `/profile`, so any inbound link to `/me`
 * now bounces to the profile page. This file is kept as a server-side
 * redirect for any cached bookmarks; remove it once analytics show no
 * traffic.
 */
export default function MePage(): never {
  redirect('/profile');
}
