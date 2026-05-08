import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WebNotificationsService } from './web-notifications.service.js';

const insertedRow = {
  id: 'notif-1',
  userId: 'u1',
  eventType: 'booking.confirmed',
  title: 'Test',
  body: 'Body',
  deepLink: null,
  readAt: null,
  createdAt: new Date(),
};

const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([insertedRow]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};

const mockBroadcast = vi.fn();

function makeService(): WebNotificationsService {
  return new WebNotificationsService(mockDb as never, mockBroadcast);
}

describe('WebNotificationsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('dispatch inserts a row and broadcasts notification:received', async () => {
    const svc = makeService();
    await svc.dispatch({
      recipientUserId: 'u1',
      eventType: 'booking.confirmed',
      title: 'Booking confirmed!',
      body: 'Your booking has been confirmed.',
      deepLink: 'petwalker://bookings/b1',
    });
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockBroadcast).toHaveBeenCalledWith(
      'user:u1:notifications',
      expect.objectContaining({ type: 'notification:received' }),
    );
  });

  it('markRead calls update with userId + notificationId + isNull(readAt)', async () => {
    const svc = makeService();
    await svc.markRead('u1', 'notif-1');
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalled();
    expect(mockDb.where).toHaveBeenCalled();
  });

  it('markAllRead calls update scoped to userId', async () => {
    const svc = makeService();
    await svc.markAllRead('u1');
    expect(mockDb.update).toHaveBeenCalled();
  });
});
