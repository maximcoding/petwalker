/**
 * DEAD ROUTE — kept as a stub so the file can be hand-deleted later.
 *
 * The canonical booking-entry route is `/providers/[id]/book` (which
 * hands off to <BookingWizard>). This `/booking/new` path was a brief
 * parallel-route mistake during the M3 wizard refactor; the user
 * explicitly asked to refactor the EXISTING booking surface rather
 * than fork a new one, so this page now just hard-redirects home.
 *
 * Action item: delete the entire `/web/src/app/(app)/booking/`
 * directory once tooling permits.
 */
import { redirect } from 'next/navigation';

export default function DeadBookingNewPage(): never {
  redirect('/home');
}
