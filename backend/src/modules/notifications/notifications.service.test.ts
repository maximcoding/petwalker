import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationsService } from './notifications.service.js';
import type { PushNotificationPayload } from './notification-builders.js';

const mockQueue = { add: vi.fn() };
const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
};
const mockWebNotifs = { dispatch: vi.fn().mockResolvedValue(undefined) };

function makeService(): NotificationsService {
  return new NotificationsService(mockDb as never, mockQueue as never, mockWebNotifs as never);
}

describe('NotificationsService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('notifyAsync', () => {
    it('enqueues a push job with attempts=3', () => {
      mockQueue.add.mockResolvedValue(undefined);
      const svc = makeService();
      const payload: PushNotificationPayload = {
        recipientUserId: 'u1',
        eventType: 'booking.confirmed',
        title: 'Test',
        body: 'Body',
      };
      svc.notifyAsync(payload);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'push',
        payload,
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('does not throw when queue.add rejects', async () => {
      mockQueue.add.mockRejectedValue(new Error('redis down'));
      const svc = makeService();
      expect(() =>
        svc.notifyAsync({ recipientUserId: 'u', eventType: 'booking.confirmed', title: '', body: '' }),
      ).not.toThrow();
      await new Promise((r) => setTimeout(r, 10));
    });
  });
});
