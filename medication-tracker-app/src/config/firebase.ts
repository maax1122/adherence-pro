/**
 * Firebase Configuration & Initialization
 * FHIR R4 compliant medical data storage with offline persistence
 *
 * React Native Firebase provides native Firebase SDK modules for React Native.
 * Configuration is done via google-services.json (Android) and GoogleService-Info.plist (iOS).
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

/**
 * Initialize Firebase services with offline persistence
 * React Native Firebase is auto-initialized on native startup
 * This function configures offline persistence settings
 */
export const initializeFirebase = async (): Promise<void> => {
  try {
    // Enable Firestore offline persistence
    // Constitution Principle I: Data Model - Offline-first with FHIR R4 compliance
    await firestore().settings({
      persistence: true,
      cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
    });

    console.log('[Firebase] Initialized with offline persistence');
  } catch (error) {
    console.error('[Firebase] Initialization failed:', error);
    throw error;
  }
};

/**
 * Get Firebase Auth instance
 * Automatically persists authentication state to device storage
 */
export const getAuthInstance = (): FirebaseAuthTypes.Module => {
  return auth();
};

/**
 * Get Firestore instance with offline persistence enabled
 * All Firestore operations work offline and sync when online
 */
export const getFirestoreInstance = (): FirebaseFirestoreTypes.Module => {
  return firestore();
};

/**
 * Get Firebase Cloud Messaging instance
 * Used for push notifications (adherence reminders)
 */
export const getMessagingInstance = (): FirebaseMessagingTypes.Module => {
  return messaging();
};

/**
 * Export Firebase services for convenient access
 */
export const firebase = {
  auth: getAuthInstance,
  firestore: getFirestoreInstance,
  messaging: getMessagingInstance,
  initialize: initializeFirebase,
};

export default firebase;
