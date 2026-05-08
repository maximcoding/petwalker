import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecurringSeriesService } from './recurring-series.service.js';

function makeDb(overrides: Record<string, unknown> = {}) {
  const base = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn({
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'series-1', instanceCount: 2 }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    })),
  };
  return { ...base, ...overrides };
}

const mockNotifications = { notifyAsync: vi.fn() };

function makeService(db: unknown) {
  return new RecurringSeriesService(db as never, mockNotifications as never);
}

describe('RecurringSeriesService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NotFoundException when pet not found', async () => {
    const db = makeDb({ limit: vi.fn().mockResolvedValue([]) });
    const svc = makeService(db);
    await expect(
      svc.create('owner-1', {
        providerId: 'prov-1',
        petId: 'pet-x',
        serviceType: 'walking',
        recurrence: 'weekly',
        daysOfWeek: [1],
        timeOfDay: '09:00',
        startDate: '2099-06-01',
        durationMin: 60,
        addressSource: 'owner_pet',
      } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('cancelRemaining throws NotFoundException when series not found', async () => {
    const db = makeDb({ limit: vi.fn().mockResolvedValue([]) });
    const svc = makeService(db);
    await expect(svc.cancelRemaining('owner-1', 'no-such-series', {})).rejects.toThrow(NotFoundException);
  });

  it('cancelRemaining throws ForbiddenException when caller is not owner or provider', async () => {
    const series = { id: 's1', ownerId: 'owner-1', providerId: 'prov-1' };
    let call = 0;
    const db = makeDb({
      limit: vi.fn().mockImplementation(async () => {
        call++;
        return call === 1 ? [series] : [];
      }),
    });
    const svc = makeService(db);
    await expect(svc.cancelRemaining('stranger', 's1', {})).rejects.toThrow(ForbiddenException);
  });
});
