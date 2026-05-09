import { redirect } from 'next/navigation';

/**
 * `/profile` is now a tabbed Settings Hub — see `layout.tsx` for the tab
 * bar and `personal/page.tsx` for the default landing.
 *
 * Hitting the bare /profile URL bounces the user to /profile/personal so
 * legacy deep links keep working and the URL always tells you which tab
 * you're looking at.
 */
export default function ProfileIndexPage(): never {
  redirect('/profile/personal');
}
