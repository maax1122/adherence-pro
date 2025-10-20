import { messaging } from '@/config/firebase';
import { getToken, onMessage, MessagePayload, isSupported } from 'firebase/messaging';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

type ForegroundMessageHandler = (payload: MessagePayload) => void;

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications are not supported in this browser.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    await navigator.serviceWorker.ready;
  }

  return permission;
}

export async function getMessagingToken(): Promise<string | null> {
  if (!(await isSupported())) {
    console.warn('Firebase messaging is not supported in this browser.');
    return null;
  }

  if (!messaging) {
    console.warn('Firebase messaging has not been initialised.');
    return null;
  }

  if (!VAPID_KEY) {
    console.warn('Missing VITE_FIREBASE_VAPID_KEY environment variable.');
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return null;
  }

  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    return token ?? null;
  } catch (error) {
    console.error('Failed to get messaging token', error);
    return null;
  }
}

export function listenForForegroundMessages(handler: ForegroundMessageHandler): () => void {
  if (!messaging) {
    console.warn('Firebase messaging has not been initialised.');
    return () => undefined;
  }

  return onMessage(messaging, handler);
}

export async function showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, options);
}

export async function notifyScheduleReminder(
  patientName: string,
  medicationName: string,
  scheduledTime: string
): Promise<void> {
  const title = `${patientName}: ${medicationName}`;
  const body = `Scheduled dose at ${scheduledTime}`;

  await showLocalNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    tag: `reminder-${medicationName}-${scheduledTime}`,
    data: {
      medicationName,
      scheduledTime,
    },
  });
}
