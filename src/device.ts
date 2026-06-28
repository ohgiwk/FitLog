import { uid } from './utils';

export const deviceIdKey = 'fit-log-device-id';

/**
 * 端末ごとの識別子を localStorage に保存して取得する
 */
export function getDeviceId(): string {
  try {
    const saved = localStorage.getItem(deviceIdKey);
    if (saved) return saved;
    const deviceId = uid();
    localStorage.setItem(deviceIdKey, deviceId);
    return deviceId;
  } catch {
    return uid();
  }
}
