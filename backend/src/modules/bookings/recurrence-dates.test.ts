import { describe, expect, it } from 'vitest';
import { generateRecurrenceDates, addWeeks } from './recurrence-dates.js';

describe('generateRecurrenceDates', () => {
  it('weekly on single day — generates one date per week', () => {
    const dates = generateRecurrenceDates({
      recurrence: 'weekly',
      daysOfWeek: [1],
      timeOfDay: '09:00',
      startDate: '2026-06-01',
      endDate: '2026-06-21',
    });
    expect(dates).toHaveLength(3); // Jun 1, 8, 15 (Jun 22 > endDate)
    expect(dates[0]!.toISOString()).toBe('2026-06-01T09:00:00.000Z');
    expect(dates[1]!.toISOString()).toBe('2026-06-08T09:00:00.000Z');
    expect(dates[2]!.toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });

  it('weekly on Mon+Wed — generates 2 dates per week', () => {
    const dates = generateRecurrenceDates({
      recurrence: 'weekly',
      daysOfWeek: [1, 3],
      timeOfDay: '10:30',
      startDate: '2026-06-01',
      endDate: '2026-06-07',
    });
    // Jun 1 Mon, Jun 3 Wed — both within the week
    expect(dates).toHaveLength(2);
    expect(dates[0]!.getUTCDay()).toBe(1);
    expect(dates[1]!.getUTCDay()).toBe(3);
    expect(dates[0]!.getUTCHours()).toBe(10);
    expect(dates[0]!.getUTCMinutes()).toBe(30);
  });

  it('biweekly — skips alternate weeks', () => {
    const dates = generateRecurrenceDates({
      recurrence: 'biweekly',
      daysOfWeek: [1],
      timeOfDay: '09:00',
      startDate: '2026-06-01',
      endDate: '2026-06-28',
    });
    expect(dates).toHaveLength(2);
    expect(dates[0]!.toISOString()).toBe('2026-06-01T09:00:00.000Z');
    expect(dates[1]!.toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });

  it('caps at MAX_INSTANCES (52)', () => {
    const dates = generateRecurrenceDates({
      recurrence: 'weekly',
      daysOfWeek: [1],
      timeOfDay: '09:00',
      startDate: '2026-01-05',
      endDate: '2027-12-31',
    });
    expect(dates).toHaveLength(52);
  });

  it('returns empty array when date range is empty', () => {
    const dates = generateRecurrenceDates({
      recurrence: 'weekly',
      daysOfWeek: [0],
      timeOfDay: '09:00',
      startDate: '2026-06-01',
      endDate: '2026-05-01',
    });
    expect(dates).toHaveLength(0);
  });
});

describe('addWeeks', () => {
  it('adds exactly N * 7 days', () => {
    expect(addWeeks('2026-06-01', 12)).toBe('2026-08-24');
  });
});
