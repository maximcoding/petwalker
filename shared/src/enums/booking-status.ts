export const BookingStatus = {
  Pending: 'pending',
  Confirmed: 'confirmed',
  InProgress: 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
] as const satisfies readonly BookingStatus[];

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.Pending,
  BookingStatus.Confirmed,
  BookingStatus.InProgress,
];

export const TERMINAL_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.Completed,
  BookingStatus.Cancelled,
];
