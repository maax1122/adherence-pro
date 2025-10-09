# Firebase New Project Setup Guide

**Objective**: Set up a fresh Firebase project with a new Google account (old project deleted)

**Date Created**: 2025-10-09  
**Status**: READY FOR EXECUTION

---

## 🎯 Overview

Since the old Firebase project is being deleted, we need to:
1. Create a new Firebase project in the new Google account
2. Update local project configuration
3. Download new client config files
4. Deploy Firestore rules and indexes
5. Test everything works

**Estimated Time**: 30-40 minutes  
**No data migration needed** (fresh start)

---

## 📋 Prerequisites

- [ ] New Google account email ready
- [ ] Old Firebase project deleted (or will be deleted)
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] gcloud CLI installed (optional): `brew install --cask google-cloud-sdk`

---

## 🚀 Step-by-Step Setup

### Step 1: Create New Firebase Project (10 minutes)

1. **Login to Firebase Console** with your NEW Google account:
   ```
   https://console.firebase.google.com/
   ```

2. **Create New Project:**
   - Click "**Add project**" or "**Create a project**"
   - **Project name**: `adherence-pro` (or your preferred name)
   - **Project ID**: `adherence-pro-new` (must be globally unique)
     - If `adherence-pro` is still taken, try: `adherence-pro-2025`, `adherence-pro-sg`, etc.
   - **Google Analytics**: 
     - Toggle ON (recommended for crash reporting)
     - Select or create Analytics account
     - Region: **Asia Pacific** (Singapore)
   - Click "**Create project**"
   - Wait ~1-2 minutes for project creation

   ✅ **Success**: You'll see "Your new project is ready"

---

### Step 2: Enable Firebase Services (10 minutes)

#### 2.1 Enable Authentication

1. In Firebase Console, go to **Build → Authentication**
2. Click "**Get started**"
3. Select "**Email/Password**" provider
4. Toggle **Enable** → Click **Save**

✅ **Success**: Email/Password shows as "Enabled"

---

#### 2.2 Create Firestore Database

1. Go to **Build → Firestore Database**
2. Click "**Create database**"
3. **Secure rules mode**: Select "**Production mode**"
   - (We'll deploy custom rules later)
4. **Firestore location**: Select **`asia-southeast1 (Singapore)`**
   - ⚠️ **Important**: Cannot be changed later!
5. Click "**Enable**"
6. Wait ~2 minutes for database initialization

✅ **Success**: You'll see the Firestore data viewer

---

#### 2.3 Enable Cloud Messaging

1. Go to **Build → Cloud Messaging**
2. Click "**Get started**"
3. No additional configuration needed (auto-enabled)

✅ **Success**: Cloud Messaging is ready

---

### Step 3: Add Client Apps (10 minutes)

#### 3.1 Add iOS App

1. In Firebase Console, go to **Project Settings** (⚙️ gear icon)
2. Scroll to "**Your apps**" section
3. Click iOS icon (Apple logo)
4. **iOS bundle ID**: `com.adherencepro.medicationtracker`
   - ⚠️ Must match your app's bundle ID
5. **App nickname**: `Adherence Pro iOS` (optional)
6. Click "**Register app**"
7. **Download** `GoogleService-Info.plist`
8. Click "**Next**" → "**Continue to console**" (skip SDK setup)

**Save the downloaded file** - you'll need it in Step 4!

---

#### 3.2 Add Android App

1. In same "**Your apps**" section, click Android icon
2. **Android package name**: `com.adherencepro.medicationtracker`
   - ⚠️ Must match your app's package name
3. **App nickname**: `Adherence Pro Android` (optional)
4. Click "**Register app**"
5. **Download** `google-services.json`
6. Click "**Next**" → "**Continue to console**" (skip SDK setup)

**Save the downloaded file** - you'll need it in Step 4!

---

### Step 4: Update Local Project Configuration (5 minutes)

#### 4.1 Login to Firebase CLI with New Account

```bash
cd /Users/maax/Projects/side/adherence-pro/medication-tracker-app

# Logout from old account
firebase logout

# Login with NEW account
firebase login
```

**Follow the browser prompt** to login with your new Google account.

✅ **Verify**: Run `firebase projects:list` - you should see your new project

---

#### 4.2 Update .firebaserc

```bash
# Open .firebaserc and update project ID
nano .firebaserc
```

**Replace** the content with your new project ID:
```json
{
  "projects": {
    "default": "adherence-pro-new"
  }
}
```

Replace `adherence-pro-new` with whatever project ID you chose in Step 1.

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

---

#### 4.3 Replace Client Config Files

```bash
# Backup old files (if they exist)
mv android/app/google-services.json android/app/google-services.json.old 2>/dev/null || true
mv ios/GoogleService-Info.plist ios/GoogleService-Info.plist.old 2>/dev/null || true

# Move downloaded files to correct locations
# You'll need to manually copy the files you downloaded in Step 3
```

**Manual Steps:**
1. Find the **`google-services.json`** file you downloaded
2. Copy it to: `medication-tracker-app/android/app/google-services.json`
3. Find the **`GoogleService-Info.plist`** file you downloaded
4. Copy it to: `medication-tracker-app/ios/GoogleService-Info.plist`

**Verify files exist:**
```bash
ls -lh android/app/google-services.json
ls -lh ios/GoogleService-Info.plist
```

---

### Step 5: Deploy Firestore Rules and Indexes (5 minutes)

```bash
cd /Users/maax/Projects/side/adherence-pro/medication-tracker-app

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

**Expected output:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/adherence-pro-new/overview
```

⚠️ **Note**: Firestore indexes take 5-10 minutes to build. You can check status in Firebase Console → Firestore → Indexes.

---

### Step 6: Rebuild Native Projects (5 minutes)

Since we updated Firebase config files, we need to rebuild the native projects:

```bash
cd /Users/maax/Projects/side/adherence-pro/medication-tracker-app

# Clean and rebuild with Expo
npx expo prebuild --clean
```

This will:
- ✅ Regenerate Android and iOS native projects
- ✅ Apply new Firebase configuration
- ✅ Update dependencies

**Expected**: Process completes without errors

---

### Step 7: Test the Setup (10 minutes)

#### 7.1 Run Tests

```bash
cd /Users/maax/Projects/side/adherence-pro/medication-tracker-app

# Run unit tests
npm run test:unit

# Run contract tests (Firestore rules)
npm run test:contract
```

**Expected**: Tests should pass (or fail as expected per TDD - see tasks.md)

---

#### 7.2 Start Development Server

```bash
npx expo start
```

Press:
- **`i`** for iOS Simulator
- **`a`** for Android Emulator
- **`w`** for Web (limited functionality)

---

#### 7.3 Manual Testing Checklist

Test in the app:
- [ ] App loads without Firebase connection errors
- [ ] Can register a new account (Auth)
- [ ] Can sign in with registered account
- [ ] Can sign out
- [ ] Check Firebase Console → Authentication → Users (should see new user)

Once you implement features (Phase 3.3 in tasks.md):
- [ ] Can create patient profile (Firestore write)
- [ ] Can view patient profiles (Firestore read)
- [ ] Can add medication (Firestore write)
- [ ] Can log medication (Firestore write)
- [ ] Offline mode works (disconnect network, make changes, reconnect)

---

## ✅ Verification Checklist

After completing all steps, verify:

### Firebase Console
- [ ] Project created with correct name and ID
- [ ] Authentication → Email/Password enabled
- [ ] Firestore Database created in `asia-southeast1`
- [ ] Firestore → Rules tab shows your custom rules (not default)
- [ ] Firestore → Indexes tab shows 7 composite indexes
- [ ] Indexes all show "**Enabled**" status (green checkmark)
- [ ] Cloud Messaging enabled
- [ ] Project Settings shows iOS app with correct bundle ID
- [ ] Project Settings shows Android app with correct package name

### Local Project
- [ ] `.firebaserc` contains new project ID
- [ ] `android/app/google-services.json` exists and contains new project data
- [ ] `ios/GoogleService-Info.plist` exists and contains new project data
- [ ] `firebase deploy` commands succeed
- [ ] Tests run without connection errors
- [ ] App connects to Firebase successfully

---

## 🆘 Troubleshooting

### "Project not found" when running Firebase CLI commands

**Solution:**
```bash
# Verify you're logged in with correct account
firebase login:list

# Verify project ID in .firebaserc matches Firebase Console
cat .firebaserc

# List all projects you have access to
firebase projects:list
```

---

### "Firestore has not been initialized" error in app

**Cause**: Database not created or wrong region

**Solution:**
1. Go to Firebase Console → Firestore Database
2. If database doesn't exist, click "Create database"
3. Select **Production mode** and **asia-southeast1**

---

### "Missing index" errors when running queries

**Cause**: Indexes still building or not deployed

**Solution:**
```bash
# Redeploy indexes
firebase deploy --only firestore:indexes

# Check status in Firebase Console → Firestore → Indexes
# Wait 5-10 minutes for all indexes to show "Enabled"
```

---

### "App not connecting to Firebase" after rebuild

**Cause**: Config files not properly replaced

**Solution:**
```bash
# Verify config files contain new project ID
grep "project_id" android/app/google-services.json
grep "PROJECT_ID" ios/GoogleService-Info.plist

# Clean rebuild
npx expo prebuild --clean

# Clear app data and reinstall
# iOS: Long press app → Remove App → Reinstall
# Android: Settings → Apps → Adherence Pro → Clear Data → Reinstall
```

---

### "Permission denied" errors in Firestore

**Cause**: Security rules not deployed or incorrect

**Solution:**
```bash
# Verify rules file exists
cat firestore.rules | head -20

# Redeploy rules
firebase deploy --only firestore:rules

# Test rules in Firebase Console → Firestore → Rules → Simulator
```

---

## 📝 What Changed?

After completing this setup:

| Item | Old Value | New Value |
|------|-----------|-----------|
| Firebase Project ID | `adherence-pro` | `adherence-pro-new` (or your chosen ID) |
| Project Owner | maaxlinh@gmail.com | [Your new Google account] |
| `.firebaserc` | Old project ID | New project ID |
| `google-services.json` | Old project config | New project config |
| `GoogleService-Info.plist` | Old project config | New project config |
| Firebase CLI auth | Old account | New account |

---

## 🎉 Success!

Once all verification items are checked, you're ready to continue development with your new Firebase project!

**Next Steps** (per tasks.md):
1. Continue Phase 3.3 implementation (T016-T024)
2. Build UI screens (T027-T033)
3. Deploy Cloud Functions (T034)
4. Launch beta (T035)

---

## 📞 Quick Reference Commands

```bash
# Check current Firebase project
firebase projects:list
cat .firebaserc

# Deploy rules and indexes
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes

# Rebuild app with new config
npx expo prebuild --clean

# Start development server
npx expo start

# Run tests
npm test
npm run test:contract

# View logs
npx expo start --ios  # iOS simulator logs
npx expo start --android  # Android emulator logs
```

---

## 📚 Resources

- **Firebase Console**: https://console.firebase.google.com/
- **Firebase Documentation**: https://firebase.google.com/docs
- **Expo Documentation**: https://docs.expo.dev/
- **React Native Firebase**: https://rnfirebase.io/

---

**Setup Guide Version**: 1.0  
**Last Updated**: 2025-10-09  
**Estimated Total Time**: 30-40 minutes
