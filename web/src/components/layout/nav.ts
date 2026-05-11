import {
  Calendar,
  Heart,
  LayoutDashboard,
  MessageCircle,
  PawPrint,
  Search,
  type LucideIcon,
} from 'lucide-react';

import type { ViewMode } from '@/contexts/view-mode-context';

/**
 * Navigation item shared by Header (desktop) and BottomTabBar (mobile).
 *
 * `i18nKey` resolves under the `nav.*` namespace.
 * `icon` is required for BottomTabBar; Header may also render it next to
 * the label for a touch of personality.
 */
export interface NavItem {
  href: string;
  i18nKey: string;
  icon: LucideIcon;
}

/**
 * Build the role-aware nav. Mirrors the previous `buildNav` from
 * `(app)/layout.tsx` and adds icons for the BottomTabBar.
 *
 *  - Owner   → Pets, Find a provider, My Bookings, Favorites, Messages   (5 items, fits a bottom tab bar)
 *  - Provider → Feed, Bookings, Messages                                  (3 items)
 */
export function buildNav(mode: ViewMode): NavItem[] {
  if (mode === 'provider') {
    return [
      { href: '/feed', i18nKey: 'nav.feed', icon: LayoutDashboard },
      { href: '/bookings', i18nKey: 'nav.managedBookings', icon: Calendar },
      { href: '/messages', i18nKey: 'nav.messages', icon: MessageCircle },
    ];
  }
  return [
    { href: '/pets', i18nKey: 'nav.pets', icon: PawPrint },
    { href: '/providers', i18nKey: 'nav.providers', icon: Search },
    { href: '/bookings', i18nKey: 'nav.myBookings', icon: Calendar },
    { href: '/favorites', i18nKey: 'nav.favorites', icon: Heart },
    { href: '/messages', i18nKey: 'nav.messages', icon: MessageCircle },
  ];
}

/** Home href per role — mirrors AppLayout's logic. */
export function homeHref(mode: ViewMode): string {
  return mode === 'provider' ? '/feed' : '/providers';
}

/** Robust active-route check that handles nested segments. */
export function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
