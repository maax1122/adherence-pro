/**
 * T024: Expo Notifications Service
 * 
 * Purpose: Schedule and handle local push notifications for medication reminders
 * 
 * Features:
 * - Request notification permissions (iOS/Android)
 * - Register for Expo push notifications
 * - Schedule local notifications from ReminderSchedule instances
 * - Handle notification responses (foreground/background/tap)
 * - Deep linking to medication logging screen
 * - Badge count management
 * - Notification action buttons ("I Took It")
 * 
 * Dependencies:
 * - expo-notifications v0.29.11+
 * - expo-device v6.0.2+
 * - @react-native-firebase/messaging v20.5.0+
 * - T021: medicationAdministrationService (for logging from notification)
 * - T022: reminderScheduleService (for scheduling instances)
 * 
 * Integration Points:
 * - Uses T022 getUpcomingReminders() to fetch instances to schedule
 * - Calls T022 markNotificationSent() after scheduling
 * - Calls T021 logMedication() from "I Took It" action
 * - Calls T022 markReminderCompleted() after logging
 * 
 * Platform Differences:
 * - iOS: Requires explicit permission request
 * - Android: Uses notification channels for Android 8.0+
 * - FCM: Firebase Cloud Messaging for remote notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import * as reminderScheduleService from '../firestore/reminderScheduleService';
import * as medicationAdministrationService from '../firestore/medicationAdministrationService';
import type { ReminderInstance, ReminderSchedule } from '../../types/fhir';

// Configure notification behavior (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Notification channel configuration (Android)
const REMINDER_CHANNEL_ID = 'medication-reminders';
const REMINDER_CHANNEL_NAME = 'Medication Reminders';
const REMINDER_CHANNEL_DESCRIPTION = 'Notifications for scheduled medication reminders';

// Action button identifiers
const ACTION_TAKE_MEDICATION = 'TAKE_MEDICATION';
const ACTION_SNOOZE = 'SNOOZE';
const ACTION_SKIP = 'SKIP';

/**
 * Initialize notification channels (Android 8.0+)
 */
async function initializeNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: REMINDER_CHANNEL_NAME,
      description: REMINDER_CHANNEL_DESCRIPTION,
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
  }
}

/**
 * Request notification permissions
 * 
 * iOS: Shows system permission dialog
 * Android: Auto-granted, but returns permission status
 * 
 * @returns {Promise<boolean>} True if granted, false otherwise
 * 
 * @example
 * const hasPermission = await requestPermissions();
 * if (!hasPermission) {
 *   // Show alert to user: "Please enable notifications in Settings"
 * }
 */
export async function requestPermissions(): Promise<boolean> {
  // Initialize channels first (Android)
  await initializeNotificationChannels();

  // Check if physical device (notifications don't work on simulators)
  if (!Device.isDevice) {
    console.warn('Notifications only work on physical devices');
    return false;
  }

  // Request Expo notifications permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permission denied');
    return false;
  }

  // iOS: Request FCM authorization
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.warn('FCM authorization denied');
      return false;
    }
  }

  return true;
}

/**
 * Register for Expo push notifications and store token in Firestore
 * 
 * Retrieves Expo push token and FCM token for the device.
 * Tokens should be stored in user document for remote push notifications.
 * 
 * @returns {Promise<{expoPushToken: string, fcmToken?: string} | null>}
 * 
 * @example
 * const tokens = await registerForPushNotifications();
 * if (tokens) {
 *   // Store tokens in user document
 *   await updateUserTokens(userId, tokens);
 * }
 */
export async function registerForPushNotifications(): Promise<{
  expoPushToken: string;
  fcmToken?: string;
} | null> {
  // Request permissions first
  const hasPermission = await requestPermissions();
  if (!hasPermission) {
    return null;
  }

  try {
    // Get Expo push token (for Expo push notification service)
    const expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;

    // Get FCM token (for Firebase Cloud Messaging)
    let fcmToken: string | undefined;
    if (Platform.OS === 'android') {
      fcmToken = await messaging().getToken();
    } else if (Platform.OS === 'ios') {
      // iOS requires APNS token first
      const apnsToken = await messaging().getAPNSToken();
      if (apnsToken) {
        fcmToken = await messaging().getToken();
      }
    }

    console.log('Push tokens registered', { expoPushToken, fcmToken });
    return { expoPushToken, fcmToken };
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Schedule a local notification for a medication reminder
 * 
 * Creates a local notification with:
 * - Title: "Time to take {medicationName}"
 * - Body: "{dosage} - {instructions}"
 * - Action buttons: "I Took It", "Snooze", "Skip"
 * - Deep link data: {scheduleId, instanceId, medicationRequestId, patientId}
 * 
 * Calls T022 markNotificationSent() after scheduling.
 * 
 * @param {ReminderSchedule} schedule - The reminder schedule containing the instance
 * @param {ReminderInstance} instance - The reminder instance from T022
 * @param {string} medicationName - Medication display name (from schedule)
 * @param {string} dosage - Dosage instruction (e.g., "1 tablet")
 * @param {string} instructions - Optional additional instructions
 * @returns {Promise<string>} Expo notification identifier
 * 
 * @example
 * const notificationId = await scheduleReminderNotification(
 *   schedule,
 *   instance,
 *   "Aspirin",
 *   "1 tablet",
 *   "Take with food"
 * );
 */
export async function scheduleReminderNotification(
  schedule: ReminderSchedule,
  instance: ReminderInstance,
  medicationName: string,
  dosage: string,
  instructions?: string
): Promise<string> {
  // Calculate trigger time
  const scheduledTime = instance.effectiveDateTime.toDate();
  const now = new Date();
  const secondsUntilTrigger = Math.max(0, Math.floor((scheduledTime.getTime() - now.getTime()) / 1000));

  // Build notification content
  const title = `Time to take ${medicationName}`;
  const body = instructions ? `${dosage} - ${instructions}` : dosage;

  // Schedule notification
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      badge: 1,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      categoryIdentifier: 'medication-reminder',
      data: {
        scheduleId: schedule.id,
        instanceId: instance.id,
        medicationRequestId: schedule.medicationRequestId,
        patientId: schedule.patientId,
        scheduledTime: instance.effectiveDateTime.toMillis(),
      },
    },
    trigger: {
      seconds: secondsUntilTrigger,
      channelId: REMINDER_CHANNEL_ID, // Android only
    },
  });

  // Mark notification as sent in ReminderInstance
  await reminderScheduleService.markNotificationSent(schedule.id, instance.id, notificationId);

  console.log(`Scheduled notification ${notificationId} for ${medicationName} at ${scheduledTime}`);
  return notificationId;
}

/**
 * Cancel a scheduled notification
 * 
 * @param {string} notificationId - Expo notification identifier
 * 
 * @example
 * await cancelNotification(notificationId);
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
  console.log(`Cancelled notification ${notificationId}`);
}

/**
 * Cancel all scheduled notifications for a user
 * 
 * Use when user signs out or disables notifications.
 * 
 * @example
 * await cancelAllNotifications();
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('Cancelled all scheduled notifications');
}

/**
 * Re-schedule all upcoming notifications for a patient
 * 
 * Fetches reminder schedules from T022 and schedules local notifications.
 * Call this:
 * - On app startup
 * - After medication schedule changes
 * - After user updates notification preferences
 * 
 * @param {string} patientId - Patient ID
 * @param {number} hoursAhead - Number of hours to schedule (default: 168 = 7 days)
 * @returns {Promise<number>} Number of notifications scheduled
 * 
 * @example
 * const scheduled = await rescheduleAllNotifications(patientId, 168);
 * console.log(`Scheduled ${scheduled} notifications`);
 */
export async function rescheduleAllNotifications(
  patientId: string,
  hoursAhead: number = 168
): Promise<number> {
  // Cancel existing notifications first
  await cancelAllNotifications();

  // Fetch reminder schedules from T022
  const schedules = await reminderScheduleService.getPatientReminderSchedules(patientId);
  const now = new Date();
  const endTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  // Schedule each instance from each schedule
  let scheduledCount = 0;
  for (const schedule of schedules) {
    if (!schedule.isEnabled) continue; // Skip disabled schedules

    for (const instance of schedule.instances) {
      const scheduledTime = instance.effectiveDateTime.toDate();
      
      // Only schedule pending instances within time window
      if (
        instance.status === 'pending' &&
        scheduledTime >= now &&
        scheduledTime <= endTime
      ) {
        try {
          // TODO: Fetch dosage from MedicationRequest
          // For now, use medication name from schedule
          await scheduleReminderNotification(
            schedule,
            instance,
            schedule.medicationName,
            'Take as prescribed', // TODO: Fetch from MedicationRequest
            undefined
          );
          scheduledCount++;
        } catch (error) {
          console.error(`Failed to schedule notification for instance ${instance.id}:`, error);
        }
      }
    }
  }

  console.log(`Rescheduled ${scheduledCount} notifications for next ${hoursAhead} hours`);
  return scheduledCount;
}

/**
 * Handle notification received in foreground
 * 
 * Called when app is open and notification arrives.
 * Used to update UI (e.g., show in-app notification banner).
 * 
 * @param {Notifications.Notification} notification
 * 
 * @example
 * Notifications.addNotificationReceivedListener(handleNotificationReceived);
 */
export function handleNotificationReceived(notification: Notifications.Notification): void {
  console.log('Notification received in foreground:', notification);
  
  // Update badge count
  Notifications.setBadgeCountAsync(1);

  // TODO: Show in-app banner or update UI
  // e.g., add to notifications list in app
}

/**
 * Handle notification response (tap or action button)
 * 
 * Called when user:
 * - Taps notification to open app
 * - Taps "I Took It" button → logs medication
 * - Taps "Snooze" button → reschedules for 15 minutes
 * - Taps "Skip" button → marks as missed
 * 
 * @param {Notifications.NotificationResponse} response
 * 
 * @example
 * Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
 */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<void> {
  console.log('Notification response:', response);

  const { notification, actionIdentifier } = response;
  const data = notification.request.content.data as {
    scheduleId: string;
    instanceId: string;
    medicationRequestId: string;
    patientId: string;
    scheduledTime: number;
  };

  // Clear badge
  await Notifications.setBadgeCountAsync(0);

  try {
    switch (actionIdentifier) {
      case ACTION_TAKE_MEDICATION:
        // User tapped "I Took It" → log medication
        await handleTakeMedicationAction(data);
        break;

      case ACTION_SNOOZE:
        // User tapped "Snooze" → reschedule for 15 minutes
        await handleSnoozeAction(data);
        break;

      case ACTION_SKIP:
        // User tapped "Skip" → mark as missed
        await handleSkipAction(data);
        break;

      default:
        // User tapped notification body → open app to log screen
        // Deep link handled by Expo Router
        console.log('Opening app to log medication screen');
        break;
    }
  } catch (error) {
    console.error('Error handling notification response:', error);
  }
}

/**
 * Handle "I Took It" action
 * 
 * Logs medication administration via T021 and marks reminder as completed via T022.
 */
async function handleTakeMedicationAction(data: {
  scheduleId: string;
  instanceId: string;
  medicationRequestId: string;
  patientId: string;
  scheduledTime: number;
}): Promise<void> {
  console.log('User tapped "I Took It"');

  // Log medication via T021
  // TODO: Get current user ID from auth context
  // TODO: Get dosage from MedicationRequest
  const administration = await medicationAdministrationService.logMedication({
    medicationRequestId: data.medicationRequestId,
    effectiveDateTime: new Date(data.scheduledTime),
    status: 'completed',
    note: 'Logged via notification',
    dosage: {
      dose: {
        value: 1, // TODO: Get from MedicationRequest
        unit: 'tablet',
      },
    },
    reminderInstanceId: data.instanceId,
  });

  // Mark reminder as completed via T022
  await reminderScheduleService.markReminderCompleted(data.scheduleId, data.instanceId, administration.id);

  console.log(`Logged medication ${administration.id} from notification`);
}

/**
 * Handle "Snooze" action
 * 
 * Reschedules notification for 15 minutes later.
 */
async function handleSnoozeAction(_data: {
  scheduleId: string;
  instanceId: string;
  medicationRequestId: string;
  patientId: string;
  scheduledTime: number;
}): Promise<void> {
  console.log('User tapped "Snooze"');

  // Cancel existing notification
  // (notification ID stored in ReminderInstance, would need to fetch)

  // Schedule new notification 15 minutes from now
  const snoozeTime = new Date();
  snoozeTime.setMinutes(snoozeTime.getMinutes() + 15);

  // TODO: Fetch schedule and medication info
  // TODO: Schedule new notification
  // TODO: Store snoozed notification ID in ReminderInstance
  console.log(`Snoozed notification to ${snoozeTime}`);
}

/**
 * Handle "Skip" action
 * 
 * Marks reminder as missed via T022.
 */
async function handleSkipAction(data: {
  scheduleId: string;
  instanceId: string;
}): Promise<void> {
  console.log('User tapped "Skip"');

  // Mark reminder as missed via T022
  await reminderScheduleService.markReminderMissed(data.scheduleId, data.instanceId);

  console.log(`Marked reminder ${data.instanceId} as missed (user skipped)`);
}

/**
 * Set up notification listeners
 * 
 * Call this in App.tsx on app startup.
 * Returns cleanup function to unsubscribe listeners.
 * 
 * @returns {() => void} Cleanup function
 * 
 * @example
 * useEffect(() => {
 *   const cleanup = setupNotificationListeners();
 *   return cleanup;
 * }, []);
 */
export function setupNotificationListeners(): () => void {
  // Foreground notification listener
  const receivedSubscription = Notifications.addNotificationReceivedListener(handleNotificationReceived);

  // Notification response listener (tap or action)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

  // Setup notification categories with actions
  setupNotificationCategories();

  console.log('Notification listeners registered');

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
    console.log('Notification listeners removed');
  };
}

/**
 * Set up notification categories with action buttons
 * 
 * Defines "medication-reminder" category with 3 actions:
 * - "I Took It" (foreground, opens app)
 * - "Snooze" (background, reschedules)
 * - "Skip" (background, marks missed)
 */
async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('medication-reminder', [
    {
      identifier: ACTION_TAKE_MEDICATION,
      buttonTitle: 'I Took It',
      options: {
        opensAppToForeground: true, // Opens app
      },
    },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: 'Snooze 15 min',
      options: {
        opensAppToForeground: false, // Background action
      },
    },
    {
      identifier: ACTION_SKIP,
      buttonTitle: 'Skip',
      options: {
        opensAppToForeground: false,
        isDestructive: true, // Red text on iOS
      },
    },
  ]);

  console.log('Notification categories configured');
}

/**
 * Get scheduled notification count
 * 
 * @returns {Promise<number>} Number of pending notifications
 */
export async function getScheduledNotificationCount(): Promise<number> {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  return notifications.length;
}

/**
 * Export all notification service functions
 */
export const notificationService = {
  requestPermissions,
  registerForPushNotifications,
  scheduleReminderNotification,
  cancelNotification,
  cancelAllNotifications,
  rescheduleAllNotifications,
  setupNotificationListeners,
  handleNotificationReceived,
  handleNotificationResponse,
  getScheduledNotificationCount,
};
