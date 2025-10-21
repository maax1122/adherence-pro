import {
  requestNotificationPermission,
  showLocalNotification,
} from '@/services/notifications/notificationService';

export interface BrowserNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: Record<string, unknown>;
}

type NotificationClickHandler = (data: Record<string, unknown> | null) => void;

const clickHandlers = new Set<NotificationClickHandler>();
let messageListenerAttached = false;

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  return requestNotificationPermission();
}

export async function sendBrowserNotification(
  payload: BrowserNotificationPayload
): Promise<boolean> {
  const permission = await ensureNotificationPermission();
  if (permission !== 'granted') {
    return false;
  }

  await showLocalNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    icon: payload.icon ?? '/icons/icon-192.png',
    badge: payload.badge ?? '/icons/icon-192.png',
    requireInteraction: payload.requireInteraction,
    data: payload.data,
    actions: payload.actions,
  });

  return true;
}

export function registerNotificationClickHandler(
  handler: NotificationClickHandler
): () => void {
  clickHandlers.add(handler);
  attachMessageListener();
  return () => {
    clickHandlers.delete(handler);
  };
}

export function dispatchNotificationClickEvent(data: Record<string, unknown> | null): void {
  clickHandlers.forEach((handler) => {
    try {
      handler(data);
    } catch (error) {
      console.error('Notification click handler failed', error);
    }
  });
}

function attachMessageListener(): void {
  if (messageListenerAttached || typeof window === 'undefined') {
    return;
  }

  const listener = (event: MessageEvent) => {
    const payload = event?.data;
    if (!payload || typeof payload !== 'object') {
      return;
    }

    if (payload.type === 'notification-click') {
      dispatchNotificationClickEvent((payload && payload.data) || null);
    }
  };

  if (navigator?.serviceWorker?.addEventListener) {
    navigator.serviceWorker.addEventListener('message', listener);
  }

  window.addEventListener('notification-click', (event) => {
    const customEvent = event as CustomEvent<Record<string, unknown> | null>;
    dispatchNotificationClickEvent(customEvent.detail ?? null);
  });

  messageListenerAttached = true;
}
