/**
 * DEAD ROUTE — kept as a stub so the file can be hand-deleted later.
 *
 * The canonical booking-detail route is `/bookings/[id]`. This
 * `/booking/[id]` path was a brief parallel-route mistake during the
 * M3 wizard refactor; redirect to the canonical route so any stale
 * links still land somewhere sensible.
 *
 * Action item: delete the entire `/web/src/app/(app)/booking/`
 * directory once tooling permits.
 */
import { redirect } from 'next/navigation';

interface Props {
  params: { id: string };
}

export default function DeadBookingDetailPage({ params }: Props): never {
  redirect(`/bookings/${params.id}`);
}
