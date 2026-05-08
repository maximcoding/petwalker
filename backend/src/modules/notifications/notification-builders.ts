export type PushEventType =
  | 'booking.confirmed'
  | 'booking.started'
  | 'booking.ended'
  | 'booking.cancelled'
  | 'message.new';

export interface PushNotificationPayload {
  recipientUserId: string;
  eventType: PushEventType;
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, string>;
}

type BookingStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_COPY: Record<BookingStatus, { title: string; body: string; eventType: PushEventType }> = {
  confirmed:   { title: 'Booking confirmed!',  body: 'Your booking has been confirmed.',      eventType: 'booking.confirmed' },
  in_progress: { title: 'Walk started!',        body: 'Your booking is underway.',             eventType: 'booking.started'   },
  completed:   { title: 'Walk complete!',        body: 'Your walk has ended. How did it go?',  eventType: 'booking.ended'     },
  cancelled:   { title: 'Booking cancelled',     body: 'Your booking was cancelled.',           eventType: 'booking.cancelled' },
};

export function buildBookingStatusPayload(opts: {
  recipientUserId: string;
  bookingId: string;
  newStatus: BookingStatus;
}): PushNotificationPayload {
  const { recipientUserId, bookingId, newStatus } = opts;
  const copy = STATUS_COPY[newStatus] ?? {
    title: 'Booking update',
    body: `Status: ${newStatus}`,
    eventType: 'booking.confirmed' as PushEventType,
  };
  return {
    recipientUserId,
    eventType: copy.eventType,
    title: copy.title,
    body: copy.body,
    deepLink: `petwalker://bookings/${bookingId}`,
    data: { bookingId },
  };
}

export function buildNewMessagePayload(opts: {
  recipientUserId: string;
  bookingId: string;
  senderName: string;
  preview: string;
}): PushNotificationPayload {
  const { recipientUserId, bookingId, senderName, preview } = opts;
  const truncated = preview.length > 80 ? preview.slice(0, 77) + '…' : preview;
  return {
    recipientUserId,
    eventType: 'message.new',
    title: `New message from ${senderName}`,
    body: truncated,
    deepLink: `petwalker://bookings/${bookingId}`,
    data: { bookingId },
  };
}
