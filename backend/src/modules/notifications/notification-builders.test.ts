import { describe, expect, it } from 'vitest';
import {
  buildBookingStatusPayload,
  buildNewMessagePayload,
} from './notification-builders.js';

describe('buildBookingStatusPayload', () => {
  it('confirmed → correct eventType, title, and deepLink', () => {
    const p = buildBookingStatusPayload({
      recipientUserId: 'u1',
      bookingId: 'b1',
      newStatus: 'confirmed',
    });
    expect(p.eventType).toBe('booking.confirmed');
    expect(p.title).toBe('Booking confirmed!');
    expect(p.deepLink).toBe('petwalker://bookings/b1');
    expect(p.data?.bookingId).toBe('b1');
  });

  it('in_progress → booking.started', () => {
    const p = buildBookingStatusPayload({
      recipientUserId: 'u1',
      bookingId: 'b1',
      newStatus: 'in_progress',
    });
    expect(p.eventType).toBe('booking.started');
  });

  it('completed → booking.ended', () => {
    const p = buildBookingStatusPayload({
      recipientUserId: 'u1',
      bookingId: 'b1',
      newStatus: 'completed',
    });
    expect(p.eventType).toBe('booking.ended');
  });

  it('cancelled → booking.cancelled', () => {
    const p = buildBookingStatusPayload({
      recipientUserId: 'u1',
      bookingId: 'b1',
      newStatus: 'cancelled',
    });
    expect(p.eventType).toBe('booking.cancelled');
  });
});

describe('buildNewMessagePayload', () => {
  it('sets correct eventType and deepLink', () => {
    const p = buildNewMessagePayload({
      recipientUserId: 'u2',
      bookingId: 'b2',
      senderName: 'Alice',
      preview: 'Hello!',
    });
    expect(p.eventType).toBe('message.new');
    expect(p.deepLink).toBe('petwalker://bookings/b2');
    expect(p.body).toContain('Hello!');
  });

  it('truncates preview longer than 80 chars', () => {
    const preview = 'a'.repeat(100);
    const p = buildNewMessagePayload({
      recipientUserId: 'u2',
      bookingId: 'b2',
      senderName: 'Bob',
      preview,
    });
    expect(p.body.length).toBeLessThanOrEqual(83); // 80 + '…' = 81 chars max
  });
});
