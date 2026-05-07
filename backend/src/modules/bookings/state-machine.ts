import type { BookingStatus, UserRole } from '@petwalker/shared';

export type BookingAction = 'confirm' | 'start' | 'end' | 'cancel';
export type CallerRole = Extract<UserRole, 'owner' | 'provider'>;

export type TransitionResult =
  | { ok: true; nextStatus: BookingStatus }
  | { ok: false; code: 'BAD_TRANSITION' | 'NOT_AUTHORIZED' };

/**
 * Pure transition table. The service layer translates the result
 * into HTTP status codes (409 / 403).
 */
export function tryTransition(
  current: BookingStatus,
  action: BookingAction,
  caller: CallerRole,
): TransitionResult {
  switch (action) {
    case 'confirm':
      if (caller !== 'provider') return { ok: false, code: 'NOT_AUTHORIZED' };
      if (current !== 'pending') return { ok: false, code: 'BAD_TRANSITION' };
      return { ok: true, nextStatus: 'confirmed' };

    case 'start':
      if (caller !== 'provider') return { ok: false, code: 'NOT_AUTHORIZED' };
      if (current !== 'confirmed') return { ok: false, code: 'BAD_TRANSITION' };
      return { ok: true, nextStatus: 'in_progress' };

    case 'end':
      if (caller !== 'provider') return { ok: false, code: 'NOT_AUTHORIZED' };
      if (current !== 'in_progress') return { ok: false, code: 'BAD_TRANSITION' };
      return { ok: true, nextStatus: 'completed' };

    case 'cancel':
      // Either side can cancel a non-terminal booking.
      if (current === 'completed' || current === 'cancelled') {
        return { ok: false, code: 'BAD_TRANSITION' };
      }
      return { ok: true, nextStatus: 'cancelled' };
  }
}
