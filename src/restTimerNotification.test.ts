import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  schedule: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: mocks,
}));

import {
  cancelRestTimerNotification,
  scheduleRestTimerNotification,
} from './restTimerNotification';

describe('restTimerNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cancel.mockResolvedValue(undefined);
    mocks.checkPermissions.mockResolvedValue({ display: 'granted' });
    mocks.requestPermissions.mockResolvedValue({ display: 'granted' });
    mocks.schedule.mockResolvedValue({ notifications: [{ id: 3003 }] });
  });

  it('終了時刻に音付き通知を予約する', async () => {
    const endTime = new Date(Date.now() + 60_000);

    await scheduleRestTimerNotification(endTime);

    expect(mocks.cancel).toHaveBeenCalledWith({ notifications: [{ id: 3003 }] });
    expect(mocks.schedule).toHaveBeenCalledWith({
      notifications: [
        expect.objectContaining({
          id: 3003,
          sound: 'Clock-Alarm.wav',
          silent: true,
          schedule: {
            at: endTime,
            allowWhileIdle: true,
          },
        }),
      ],
    });
  });

  it('権限がない場合は要求し、拒否されたら予約しない', async () => {
    mocks.checkPermissions.mockResolvedValue({ display: 'prompt' });
    mocks.requestPermissions.mockResolvedValue({ display: 'denied' });

    await scheduleRestTimerNotification(new Date(Date.now() + 60_000));

    expect(mocks.requestPermissions).toHaveBeenCalledOnce();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it('停止時に予約済み通知を取り消す', async () => {
    await cancelRestTimerNotification();

    expect(mocks.cancel).toHaveBeenCalledWith({ notifications: [{ id: 3003 }] });
  });
});
