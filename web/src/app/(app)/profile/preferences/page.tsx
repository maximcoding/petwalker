import { redirect } from 'next/navigation';

/**
 * Display preferences (language / currency / units) moved into the
 * avatar UserMenu — see `web/src/components/user-menu.tsx`. Anyone
 * landing here from a stale link bounces back to /profile/personal so
 * they're not stranded.
 */
export default function PreferencesPage(): never {
  redirect('/profile/personal');
}
