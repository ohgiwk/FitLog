import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const restTimerNotificationId = 3003;
const restTimerSoundName = 'Clock-Alarm.wav';
let notificationGeneration = 0;

/**
 * ネイティブ端末で、レスト終了時刻に鳴るローカル通知を予約する
 */
export async function scheduleRestTimerNotification(endTime: Date) {
  if (!Capacitor.isNativePlatform()) return;
  const generation = ++notificationGeneration;

  await LocalNotifications.cancel({
    notifications: [{ id: restTimerNotificationId }],
  });
  if (generation !== notificationGeneration) return;

  let permission = await LocalNotifications.checkPermissions();
  if (generation !== notificationGeneration) return;
  if (permission.display !== 'granted') {
    permission = await LocalNotifications.requestPermissions();
  }
  if (generation !== notificationGeneration || permission.display !== 'granted') return;
  if (endTime.getTime() <= Date.now()) return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: restTimerNotificationId,
        title: 'レスト終了',
        body: '次のセットを始めましょう',
        sound: restTimerSoundName,
        silent: true,
        schedule: {
          at: endTime,
          allowWhileIdle: true,
        },
      },
    ],
  });
}

/**
 * 停止・再スタート・前面完了時に、予約済みの終了通知を取り消す
 */
export async function cancelRestTimerNotification() {
  ++notificationGeneration;
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({
    notifications: [{ id: restTimerNotificationId }],
  });
}
