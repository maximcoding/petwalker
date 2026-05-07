import { describe, expect, it } from 'vitest';

import { tryTransition, type BookingAction, type CallerRole } from './state-machine.js';

import type { BookingStatus } from '@petwalker/shared';

const ALL_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
];

describe('tryTransition: confirm', () => {
  it('provider on pending → confirmed', () => {
    expect(tryTransition('pending', 'confirm', 'provider')).toEqual({
      ok: true,
      nextStatus: 'confirmed',
    });
  });

  it('owner on pending → NOT_AUTHORIZED', () => {
    expect(tryTransition('pending', 'confirm', 'owner')).toEqual({
      ok: false,
      code: 'NOT_AUTHORIZED',
    });
  });

  it('provider on non-pending → BAD_TRANSITION', () => {
    for (const s of ALL_STATUSES.filter((s) => s !== 'pending')) {
      expect(tryTransition(s, 'confirm', 'provider')).toEqual({
        ok: false,
        code: 'BAD_TRANSITION',
      });
    }
  });
});

describe('tryTransition: start', () => {
  it('provider on confirmed → in_progress', () => {
    expect(tryTransition('confirmed', 'start', 'provider')).toEqual({
      ok: true,
      nextStatus: 'in_progress',
    });
  });

  it('owner → NOT_AUTHORIZED regardless of status', () => {
    for (const s of ALL_STATUSES) {
      expect(tryTransition(s, 'start', 'owner')).toEqual({
        ok: false,
        code: 'NOT_AUTHORIZED',
      });
    }
  });

  it('provider on non-confirmed → BAD_TRANSITION', () => {
    for (const s of ALL_STATUSES.filter((s) => s !== 'confirmed')) {
      expect(tryTransition(s, 'start', 'provider')).toEqual({
        ok: false,
        code: 'BAD_TRANSITION',
      });
    }
  });
});

describe('tryTransition: end', () => {
  it('provider on in_progress → completed', () => {
    expect(tryTransition('in_progress', 'end', 'provider')).toEqual({
      ok: true,
      nextStatus: 'completed',
    });
  });

  it('owner → NOT_AUTHORIZED', () => {
    expect(tryTransition('in_progress', 'end', 'owner')).toEqual({
      ok: false,
      code: 'NOT_AUTHORIZED',
    });
  });

  it('provider on non-in_progress → BAD_TRANSITION', () => {
    for (const s of ALL_STATUSES.filter((s) => s !== 'in_progress')) {
      expect(tryTransition(s, 'end', 'provider')).toEqual({
        ok: false,
        code: 'BAD_TRANSITION',
      });
    }
  });
});

describe('tryTransition: cancel', () => {
  it.each<[BookingStatus, CallerRole]>([
    ['pending', 'owner'],
    ['pending', 'provider'],
    ['confirmed', 'owner'],
    ['confirmed', 'provider'],
    ['in_progress', 'owner'],
    ['in_progress', 'provider'],
  ])('any side can cancel %s booking (caller=%s)', (status, caller) => {
    expect(tryTransition(status, 'cancel', caller)).toEqual({
      ok: true,
      nextStatus: 'cancelled',
    });
  });

  it.each<[BookingStatus]>([['completed'], ['cancelled']])(
    'cannot cancel terminal %s',
    (status) => {
      expect(tryTransition(status, 'cancel', 'owner')).toEqual({
        ok: false,
        code: 'BAD_TRANSITION',
      });
      expect(tryTransition(status, 'cancel', 'provider')).toEqual({
        ok: false,
        code: 'BAD_TRANSITION',
      });
    },
  );
});

describe('exhaustive matrix sanity', () => {
  // Just make sure tryTransition never crashes for any combination.
  it('every (status, action, role) returns a typed result', () => {
    const actions: BookingAction[] = ['confirm', 'start', 'end', 'cancel'];
    const roles: CallerRole[] = ['owner', 'provider'];
    for (const s of ALL_STATUSES) {
      for (const a of actions) {
        for (const r of roles) {
          const t = tryTransition(s, a, r);
          if (t.ok) {
            expect(ALL_STATUSES).toContain(t.nextStatus);
          } else {
            expect(['BAD_TRANSITION', 'NOT_AUTHORIZED']).toContain(t.code);
          }
        }
      }
    }
  });
});
