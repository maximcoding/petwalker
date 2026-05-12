/**
 * Booking lifecycle — pure functions, no React, no fetch.
 *
 * Authoritative reference:
 * .claude/skills/dogwalk-design/references/booking-lifecycle.md
 *
 * The brief defines five primary states (Pending, Confirmed, In progress,
 * Completed, Cancelled) plus a sub-state In dispute. All transition logic,
 * refund math, and recurring-child generation live here so the BookingDetail
 * screen can render its action footer with a single typed call.
 */

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'inProgress'
  | 'completed'
  | 'cancelled';

export type DisputeStatus = 'none' | 'open' | 'resolved';

export type Role = 'owner' | 'provider';

export type Actor = 'owner' | 'provider' | 'system';

export interface LifecycleBooking {
  id: string;
  ownerId: string;
  providerId: string;
  status: BookingStatus;
  disputeStatus?: DisputeStatus;
  /** ISO timestamp when the booking was created. */
  createdAt: Date;
  /** Scheduled start. */
  scheduledAt: Date;
  /** Duration in minutes (for time-slot bookings). */
  durationMin: number;
  /** Total amount the owner pays (excluding optional tip), in cents. */
  totalCents: number;
  /** Platform fee component already included in totalCents, in cents. */
  platformFeeCents: number;
}

/* ------------------------------------------------------------------
 * Transition matrix
 * ------------------------------------------------------------------ */

export type TransitionTo = BookingStatus;

export function canTransition(
  b: LifecycleBooking,
  to: TransitionTo,
  actor: Actor,
  now: Date = new Date(),
): boolean {
  switch (b.status) {
    case 'pending':
      if (to === 'confirmed' && actor === 'provider') return true;
      if (to === 'cancelled' && (actor === 'owner' || actor === 'provider' || actor === 'system'))
        return true;
      return false;
    case 'confirmed':
      if (to === 'inProgress' && actor === 'provider')
        return isStartWindowOpen(now, b.scheduledAt, b.durationMin);
      if (to === 'cancelled' && (actor === 'owner' || actor === 'provider')) return true;
      return false;
    case 'inProgress':
      if (to === 'completed' && actor === 'provider') return true;
      return false;
    default:
      return false;
  }
}

/* ------------------------------------------------------------------
 * Start window — provider can hit Start 15 min before scheduledAt
 * through the booking's duration.
 * ------------------------------------------------------------------ */

export function isStartWindowOpen(
  now: Date,
  scheduledAt: Date,
  durationMin: number,
): boolean {
  const open = new Date(scheduledAt.getTime() - 15 * 60_000);
  const close = new Date(scheduledAt.getTime() + durationMin * 60_000);
  return now >= open && now <= close;
}

/* ------------------------------------------------------------------
 * Pending expiry — 24 h auto-cancel for unanswered requests.
 * ------------------------------------------------------------------ */

export function isPendingExpired(b: LifecycleBooking, now: Date): boolean {
  if (b.status !== 'pending') return false;
  return now.getTime() - b.createdAt.getTime() >= 24 * 60 * 60_000;
}

/* ------------------------------------------------------------------
 * Refund math per the brief.
 *
 *   Owner cancels ≥ 2 h before start → full refund, no platform fee.
 *   Owner cancels < 2 h before start → no refund.
 *   Provider cancels (any time)      → full refund to owner; provider
 *                                       charged a no-show fee.
 * ------------------------------------------------------------------ */

export interface RefundOutcome {
  /** Cents returned to the owner. */
  refundCents: number;
  /** Platform fee component that the platform keeps. 0 = waived. */
  platformFeeChargedCents: number;
  /** Penalty applied to the provider (no-show fee). 0 if none. */
  providerNoShowFeeCents: number;
}

export interface RefundPolicy {
  /** Flat no-show fee charged to a provider who cancels. */
  providerNoShowFeeCents: number;
}

export function refundForCancellation(
  b: LifecycleBooking,
  cancelledBy: Actor,
  now: Date,
  policy: RefundPolicy,
): RefundOutcome {
  if (cancelledBy === 'system') {
    // System cancel happens for pending expiry — there's no charge to refund
    // (the card hold is released, not refunded).
    return { refundCents: 0, platformFeeChargedCents: 0, providerNoShowFeeCents: 0 };
  }
  if (cancelledBy === 'provider') {
    return {
      refundCents: b.totalCents,
      platformFeeChargedCents: 0,
      providerNoShowFeeCents: policy.providerNoShowFeeCents,
    };
  }
  // Owner cancellation — 2-hour rule
  const msToStart = b.scheduledAt.getTime() - now.getTime();
  const earlyEnough = msToStart >= 2 * 60 * 60_000;
  if (earlyEnough) {
    return {
      refundCents: b.totalCents,
      platformFeeChargedCents: 0,
      providerNoShowFeeCents: 0,
    };
  }
  return {
    refundCents: 0,
    platformFeeChargedCents: b.platformFeeCents,
    providerNoShowFeeCents: 0,
  };
}

/* ------------------------------------------------------------------
 * Action footer per (state, role)
 * ------------------------------------------------------------------ */

export interface ActionDescriptor {
  id: string;
  labelKey: string;
  /** Default English label used when no i18n key resolves. */
  defaultLabel: string;
  kind: 'primary' | 'secondary' | 'destructive' | 'link';
  /** Whether the action is currently enabled. */
  enabled: boolean;
  /** Optional message shown when disabled (e.g. "starts in 12 min"). */
  disabledReason?: string;
}

export function getActions(
  b: LifecycleBooking,
  role: Role,
  now: Date = new Date(),
): ActionDescriptor[] {
  const out: ActionDescriptor[] = [];

  if (role === 'owner') {
    switch (b.status) {
      case 'pending':
        out.push({
          id: 'cancel',
          labelKey: 'booking.actions.cancel',
          defaultLabel: 'Cancel booking',
          kind: 'destructive',
          enabled: true,
        });
        break;
      case 'confirmed':
        out.push({
          id: 'cancel',
          labelKey: 'booking.actions.cancel',
          defaultLabel: 'Cancel booking',
          kind: 'destructive',
          enabled: true,
        });
        out.push({
          id: 'editNotes',
          labelKey: 'booking.actions.editNotes',
          defaultLabel: 'Edit notes',
          kind: 'secondary',
          enabled: true,
        });
        out.push({
          id: 'getDirections',
          labelKey: 'actions.getDirections',
          defaultLabel: 'Get directions',
          kind: 'link',
          enabled: true,
        });
        break;
      case 'inProgress':
        out.push({
          id: 'openInProgress',
          labelKey: 'booking.actions.openLive',
          defaultLabel: 'Open live view',
          kind: 'primary',
          enabled: true,
        });
        out.push({
          id: 'somethingWrong',
          labelKey: 'booking.actions.somethingWrong',
          defaultLabel: "Something's wrong",
          kind: 'secondary',
          enabled: true,
        });
        break;
      case 'completed':
        out.push({
          id: 'leaveReview',
          labelKey: 'booking.actions.leaveReview',
          defaultLabel: 'Leave a review',
          kind: 'primary',
          enabled: true,
        });
        out.push({
          id: 'viewInvoice',
          labelKey: 'booking.actions.viewInvoice',
          defaultLabel: 'View invoice',
          kind: 'link',
          enabled: true,
        });
        break;
      case 'cancelled':
        out.push({
          id: 'getHelp',
          labelKey: 'booking.actions.getHelp',
          defaultLabel: 'Get help',
          kind: 'link',
          enabled: true,
        });
        break;
    }
  } else {
    // Provider role
    switch (b.status) {
      case 'pending':
        out.push({
          id: 'confirm',
          labelKey: 'actions.confirm',
          defaultLabel: 'Confirm',
          kind: 'primary',
          enabled: true,
        });
        out.push({
          id: 'decline',
          labelKey: 'actions.decline',
          defaultLabel: 'Decline',
          kind: 'destructive',
          enabled: true,
        });
        break;
      case 'confirmed': {
        const startOpen = isStartWindowOpen(now, b.scheduledAt, b.durationMin);
        const msToStart = b.scheduledAt.getTime() - now.getTime();
        const minsToStart = Math.max(0, Math.round(msToStart / 60_000));
        out.push({
          id: 'start',
          labelKey: 'booking.actions.start',
          defaultLabel: 'Start',
          kind: 'primary',
          enabled: startOpen,
          disabledReason: startOpen ? undefined : `Unlocks in ${Math.max(0, minsToStart - 15)} min`,
        });
        out.push({
          id: 'cancel',
          labelKey: 'booking.actions.cancel',
          defaultLabel: 'Cancel',
          kind: 'destructive',
          enabled: true,
        });
        out.push({
          id: 'getDirections',
          labelKey: 'actions.getDirections',
          defaultLabel: 'Get directions',
          kind: 'link',
          enabled: true,
        });
        break;
      }
      case 'inProgress':
        out.push({
          id: 'end',
          labelKey: 'booking.actions.end',
          defaultLabel: 'End',
          kind: 'primary',
          enabled: true,
        });
        out.push({
          id: 'openInProgress',
          labelKey: 'booking.actions.openLive',
          defaultLabel: 'Open live view',
          kind: 'secondary',
          enabled: true,
        });
        break;
      case 'completed':
      case 'cancelled':
        out.push({
          id: 'getHelp',
          labelKey: 'booking.actions.getHelp',
          defaultLabel: 'Get help',
          kind: 'link',
          enabled: true,
        });
        break;
    }
  }

  return out;
}

/* ------------------------------------------------------------------
 * Recurring child generation
 * ------------------------------------------------------------------ */

export type Recurrence = {
  kind: 'weekly' | 'biWeekly' | 'monthly';
  /** Optional last child date (inclusive). */
  until?: Date;
};

export interface RecurringWindow {
  start: Date;
  end: Date;
  reason?: string;
}

export interface RecurringChild
  extends Omit<LifecycleBooking, 'status' | 'createdAt'> {
  parentBookingId: string;
  skipped: boolean;
  skipReason?: string;
  status: BookingStatus;
  createdAt: Date;
}

const STEP_MS = {
  weekly: 7 * 24 * 60 * 60_000,
  biWeekly: 14 * 24 * 60 * 60_000,
  monthly: 30 * 24 * 60 * 60_000, // approximation; M5 spec can tighten to calendar months
} as const;

export function generateChildren(
  parent: LifecycleBooking,
  rec: Recurrence,
  blocked: RecurringWindow[],
  now: Date,
  maxOccurrences: number = 12,
): RecurringChild[] {
  const out: RecurringChild[] = [];
  const step = STEP_MS[rec.kind];
  for (let i = 1; i <= maxOccurrences; i++) {
    const scheduledAt = new Date(parent.scheduledAt.getTime() + i * step);
    if (rec.until && scheduledAt > rec.until) break;
    const conflict = blocked.find(
      (b) => scheduledAt >= b.start && scheduledAt <= b.end,
    );
    out.push({
      ...parent,
      id: `${parent.id}-child-${i}`,
      parentBookingId: parent.id,
      scheduledAt,
      createdAt: now,
      status: 'pending',
      skipped: Boolean(conflict),
      skipReason: conflict?.reason,
    });
  }
  return out;
}

/* ------------------------------------------------------------------
 * Status-pill colour map (single source of truth — used by Pill UI)
 * ------------------------------------------------------------------ */

export const STATUS_HUE = {
  pending: 'sunshine',
  confirmed: 'sky',
  inProgress: 'mint',
  completed: 'warm',
  cancelled: 'coral',
  inDispute: 'lavender',
} as const;
