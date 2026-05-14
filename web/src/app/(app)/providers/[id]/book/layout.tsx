import type { JSX, PropsWithChildren } from 'react';

/**
 * Route-scoped layout for /providers/[id]/book — pulls the booking
 * wizard out of normal document flow with `position: fixed` so its
 * own `flex flex-col` chrome (fixed top + scrollable middle + fixed
 * bottom CTA) covers the whole viewport area below the app top nav.
 *
 * Why fixed (not calc'd h-dvh):
 *   • The outer `(app)/layout.tsx` renders a desktop footer + (on
 *     mobile) a bottom tab bar BELOW `main`. Any height calc that
 *     ignores those gives `top-nav + wizard + footer > 100dvh` →
 *     the page itself starts scrolling.
 *   • `position: fixed` removes the wizard from flow entirely, so
 *     `main` collapses to its container padding and the page total
 *     fits inside `min-h-screen`. No outer scroll.
 *   • The wizard visually covers the app footer during the booking
 *     task — matches Stripe-checkout / Wag-style focused flows.
 *
 * `top-14` = 56px = the app's `ResponsiveTopChrome` height. Adjust
 * if that header is ever resized.
 */
export default function BookingRouteLayout({
  children,
}: PropsWithChildren): JSX.Element {
  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-base overflow-hidden bg-surface-base">
      {children}
    </div>
  );
}
