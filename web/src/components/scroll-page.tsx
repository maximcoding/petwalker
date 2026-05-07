import type { PropsWithChildren } from 'react';

/**
 * Wrapper for content-only pages inside the AppLayout shell.
 *
 * AppLayout's `<main>` is `overflow-hidden` and gives each page exactly the
 * available viewport height. Content pages (profile, detail views, forms)
 * use this wrapper to scroll their entire body inside that bounded area.
 *
 * List pages do NOT use this — they keep their headers + filters fixed and
 * scroll only the items list (see `/pets`, `/providers`, `/bookings`).
 */
export function ScrollPage({ children }: PropsWithChildren): JSX.Element {
  return <div className="h-full overflow-y-auto py-8">{children}</div>;
}
