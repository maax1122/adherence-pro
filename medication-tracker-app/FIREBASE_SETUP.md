# Firebase Setup Guide

This guide will walk you through setting up Firebase for the Medication Family Tracker app.

## Prerequisites

- Firebase account (free tier is sufficient for development)
- Node.js installed
- Expo CLI installed

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `adherence-pro` (or your preferred name)
4. Enable/disable Google Analytics (optional for this project)
5. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Enable **Email/Password** authentication:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

## Step 3: Create Firestore Database

1. In Firebase Console, go to **Build > Firestore Database**
2. Click "Create database"
3. Select **Start in test mode** (we'll update security rules later)
4. Choose a Firestore location (select closest to your users)
5. Click "Enable"

## Step 4: Enable Cloud Messaging

1. In Firebase Console, go to **Build > Cloud Messaging**
2. No additional setup needed - it's automatically enabled
3. Note: Push notification certificates will be configured later for iOS

## Step 5: Register iOS App

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Under "Your apps", click the **iOS** button
3. Fill in the form:
   - **iOS bundle ID**: `com.yourcompany.medicationtrackerapp` (or your preferred bundle ID)
   - **App nickname**: `Medication Tracker iOS` (optional)
   - **App Store ID**: Leave blank for now
4. Click "Register app"
5. **Download `GoogleService-Info.plist`**
6. Move `GoogleService-Info.plist` to:
   ```bash
   medication-tracker-app/ios/GoogleService-Info.plist
   ```
7. Click "Next" through the remaining steps

## Step 6: Register Android App

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Under "Your apps", click the **Android** button
3. Fill in the form:
   - **Android package name**: `com.yourcompany.medicationtrackerapp` (must match iOS bundle ID)
   - **App nickname**: `Medication Tracker Android` (optional)
   - **Debug signing certificate SHA-1**: Leave blank for now (we'll add this later for Google Sign-In)
4. Click "Register app"
5. **Download `google-services.json`**
6. Move `google-services.json` to:
   ```bash
   medication-tracker-app/android/app/google-services.json
   ```
7. Click "Next" through the remaining steps

## Step 7: Configure Bundle ID in Expo

Update `app.json` to match your Firebase bundle ID:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.medicationtrackerapp"
    },
    "android": {
      "package": "com.yourcompany.medicationtrackerapp"
    }
  }
}
```

## Step 8: Install Firebase Configuration Files

After downloading the configuration files, place them in the correct locations:

```bash
# iOS
medication-tracker-app/ios/GoogleService-Info.plist

# Android
medication-tracker-app/android/app/google-services.json
```

**Important**: These files contain sensitive API keys. Make sure they're in `.gitignore`:

```bash
# Check .gitignore contains:
ios/GoogleService-Info.plist
android/app/google-services.json
```

## Step 9: Rebuild Native Projects

Since Firebase requires native configuration, rebuild your app:

```bash
cd medication-tracker-app

# Prebuild native projects (generates ios/ and android/ folders)
npx expo prebuild

# Run on iOS simulator
npx expo run:ios

# Or run on Android emulator
npx expo run:android
```

## Step 10: Configure Firestore Security Rules

1. In Firebase Console, go to **Firestore Database > Rules**
2. Replace the default rules with our secure rules:

```javascript
// Copy rules from: specs/001-medication-family-tracker/contracts/firestore.rules
```

3. Click "Publish"

## Step 11: Create Firestore Indexes

1. In Firebase Console, go to **Firestore Database > Indexes**
2. Create the following composite indexes:

```bash
# Copy index definitions from: specs/001-medication-family-tracker/contracts/firestore.indexes.json
```

Or use Firebase CLI:
```bash
firebase deploy --only firestore:indexes
```

## Step 12: Verify Setup

Test Firebase initialization in your app:

```typescript
import firebase from './src/config/firebase';

// Initialize Firebase
await firebase.initialize();

// Test Auth
const auth = firebase.auth();
console.log('Auth initialized:', auth);

// Test Firestore
const firestore = firebase.firestore();
console.log('Firestore initialized:', firestore);
```

## Troubleshooting

### iOS: "Firebase not initialized" error
- Verify `GoogleService-Info.plist` is in `ios/` folder
- Run `npx expo prebuild --clean` to regenerate native projects
- Check Xcode project includes `GoogleService-Info.plist` in target

### Android: "Firebase not initialized" error
- Verify `google-services.json` is in `android/app/` folder
- Run `npx expo prebuild --clean` to regenerate native projects
- Check `android/app/build.gradle` includes `apply plugin: 'com.google.gms.google-services'`

### Firestore offline persistence issues
- Check Firestore settings in `src/config/firebase.ts`
- Verify device has sufficient storage
- Clear app data and reinstall if needed

## Next Steps

After Firebase is configured:

1. ✅ Test authentication flow (sign up, sign in, sign out)
2. ✅ Test Firestore CRUD operations
3. ✅ Test offline persistence (airplane mode)
4. ✅ Deploy Firestore security rules
5. ✅ Deploy Firestore indexes
6. ✅ Set up Cloud Messaging for push notifications

## References

- [React Native Firebase Documentation](https://rnfirebase.io/)
- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Expo with Firebase](https://docs.expo.dev/guides/using-firebase/)
