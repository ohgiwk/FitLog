import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { State } from './types';
import { isRecordedSet, localDate, parseDate } from './utils';

const reminderNotificationId = 3001;
const testNotificationId = 3002;
const reminderHour = 20;
const reminderDelayDays = 3;
const notificationTitle = '疲れは取れましたか？';
const notificationBody = 'トレーニングを始めましょう';
let browserReminderTimeoutId = 0;

export type NotificationPermissionState = 'granted' | 'denied' | 'unsupported';

export function isNotificationSupported() {
  return Capacitor.isNativePlatform() || 'Notification' in window;
}

export async function requestWorkoutReminderPermission(): Promise<NotificationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return 'granted';
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted' ? 'granted' : 'denied';
  }

  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied';
}

export async function syncWorkoutReminderNotification(state: State) {
  if (!state.notificationSettings.enabled || !isNotificationSupported()) {
    await cancelWorkoutReminderNotification();
    return;
  }

  const target = buildReminderDate(state);
  if (!target) {
    await cancelWorkoutReminderNotification();
    return;
  }

  if (Capacitor.isNativePlatform()) {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') return;
    await LocalNotifications.cancel({ notifications: [{ id: reminderNotificationId }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: reminderNotificationId,
          title: notificationTitle,
          body: notificationBody,
          schedule: { at: target },
        },
      ],
    });
    return;
  }

  await scheduleBrowserNotification(target);
}

export async function sendTestWorkoutReminderNotification(): Promise<NotificationPermissionState> {
  const permission = await requestWorkoutReminderPermission();
  if (permission !== 'granted') return permission;

  if (Capacitor.isNativePlatform()) {
    const at = new Date(Date.now() + 1000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: testNotificationId,
          title: notificationTitle,
          body: notificationBody,
          schedule: { at },
        },
      ],
    });
    return 'granted';
  }

  new Notification(notificationTitle, {
    body: notificationBody,
    tag: 'fitlog-workout-reminder-test',
  });
  return 'granted';
}

export async function cancelWorkoutReminderNotification() {
  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.cancel({ notifications: [{ id: reminderNotificationId }] });
  }
  if (browserReminderTimeoutId) {
    window.clearTimeout(browserReminderTimeoutId);
    browserReminderTimeoutId = 0;
  }
}

function buildReminderDate(state: State) {
  const lastWorkoutDate = findLastRecordedWorkoutDate(state);
  const base = lastWorkoutDate ? parseDate(lastWorkoutDate) : new Date();
  const target = new Date(base);
  target.setDate(base.getDate() + reminderDelayDays);
  target.setHours(reminderHour, 0, 0, 0);

  const now = new Date();
  if (target.getTime() <= now.getTime()) {
    const soon = new Date(now);
    soon.setMinutes(now.getMinutes() + 1, 0, 0);
    return soon;
  }

  return target;
}

function findLastRecordedWorkoutDate(state: State) {
  return state.workouts.reduce<string | null>((lastDate, workout) => {
    if (!workout.sets.some(isRecordedSet)) return lastDate;
    if (!lastDate || workout.date > lastDate) return workout.date;
    return lastDate;
  }, null);
}

function scheduleBrowserNotification(target: Date) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return Promise.resolve();
  }

  const delay = Math.max(0, target.getTime() - Date.now());
  if (browserReminderTimeoutId) window.clearTimeout(browserReminderTimeoutId);
  browserReminderTimeoutId = window.setTimeout(() => {
    if (document.visibilityState === 'visible') return;
    new Notification(notificationTitle, {
      body: notificationBody,
      tag: `fitlog-workout-reminder-${localDate(target)}`,
    });
  }, delay);

  return Promise.resolve();
}
