import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Expo } from 'expo-server-sdk';
import { PushWorker } from './push.worker.js';
import type { PushNotificationPayload } from './notification-builders.js';

const validToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

const mockDispatcher = { send: vi.fn().mockResolvedValue(undefined) };
const makeDb = (tokens: string[]) => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(tokens.map((t) => ({ expoToken: t }))),
});

function makeJob(payload: PushNotificationPayload) {
  return { data: payload } as never;
}

describe('PushWorker', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls dispatcher with valid token', async () => {
    const db = makeDb([validToken]);
    const worker = new PushWorker(db as never, mockDispatcher);
    await worker.process(
      makeJob({ recipientUserId: 'u1', eventType: 'booking.confirmed', title: 'T', body: 'B', deepLink: 'petwalker://bookings/b1', data: { bookingId: 'b1' } }),
    );
    expect(mockDispatcher.send).toHaveBeenCalledOnce();
    const [msgs] = mockDispatcher.send.mock.calls[0] as [{ to: string }[]];
    expect(msgs[0]!.to).toBe(validToken);
  });

  it('skips when no tokens for user', async () => {
    const db = makeDb([]);
    const worker = new PushWorker(db as never, mockDispatcher);
    await worker.process(
      makeJob({ recipientUserId: 'u2', eventType: 'message.new', title: 'T', body: 'B' }),
    );
    expect(mockDispatcher.send).not.toHaveBeenCalled();
  });

  it('filters invalid token strings via Expo.isExpoPushToken', async () => {
    const db = makeDb(['not-a-real-token']);
    const worker = new PushWorker(db as never, mockDispatcher);
    await worker.process(
      makeJob({ recipientUserId: 'u3', eventType: 'booking.started', title: 'T', body: 'B' }),
    );
    expect(mockDispatcher.send).not.toHaveBeenCalled();
  });
});
