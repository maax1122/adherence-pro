# Firebase Deployment Guide - T025 & T026

## Prerequisites

You need Firebase CLI installed. If not installed, run:

```bash
# Option 1: Install via npm (if you have Node.js)
npm install -g firebase-tools

# Option 2: Install via standalone binary (macOS)
curl -sL https://firebase.tools | bash

# Option 3: Install via Homebrew (macOS)
brew install firebase-cli
```

---

## Step 1: Login to Firebase

```bash
firebase login
```

This will open a browser window for Google authentication.

---

## Step 2: Verify Firebase Project

Check if your Firebase project exists:

```bash
firebase projects:list
```

If `adherence-pro` doesn't exist, create it in [Firebase Console](https://console.firebase.google.com/):
1. Click "Add project"
2. Name: `adherence-pro`
3. Follow setup wizard

---

## Step 3: Link Local Project to Firebase

The `.firebaserc` file already links to `adherence-pro` project.

To change the project name, edit `.firebaserc`:
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

Or use the CLI:
```bash
firebase use --add
# Select your Firebase project from the list
```

---

## Step 4: Deploy Firestore Security Rules (T025)

```bash
cd medication-tracker-app
firebase deploy --only firestore:rules
```

**Expected Output:**
```
✔  Deploy complete!

Firestore Rules deployed successfully
```

---

## Step 5: Verify Security Rules Deployment

```bash
firebase firestore:rules get
```

This will show your deployed security rules.

---

## Step 6: Deploy Firestore Indexes (T026)

First, let's continue with T026 to create `firestore.indexes.json`, then deploy:

```bash
firebase deploy --only firestore:indexes
```

---

## Alternative: Deploy Both at Once

After T026 is complete:

```bash
firebase deploy --only firestore
```

This deploys both rules and indexes.

---

## Testing with Firebase Emulator (Optional)

Before deploying to production, test locally:

```bash
# Start emulator
firebase emulators:start --only firestore

# In another terminal, run tests
npm test -- tests/contract
```

Emulator UI will be available at: http://localhost:4000

---

## Troubleshooting

### Error: "Failed to get Firebase project"

**Solution:** Update `.firebaserc` with correct project ID:
```bash
firebase use --add
```

### Error: "Permission denied"

**Solution:** Login again or check IAM permissions:
```bash
firebase login --reauth
```

### Error: "npm: command not found"

**Solution:** Install Node.js first:
- macOS: `brew install node`
- Or download from: https://nodejs.org/

---

## Firebase Project Setup (If New)

If you haven't set up Firebase yet:

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Name: `adherence-pro`

2. **Enable Firestore**
   - Go to Build > Firestore Database
   - Click "Create database"
   - Select "Start in production mode" (we have rules ready)
   - Choose location (e.g., us-central1)

3. **Enable Authentication**
   - Go to Build > Authentication
   - Click "Get started"
   - Enable "Email/Password" provider

4. **Enable Cloud Messaging**
   - Go to Build > Cloud Messaging
   - Already enabled by default

5. **Get Web Config**
   - Go to Project Settings > General
   - Under "Your apps" > Web app
   - Copy the config for `src/config/firebase.ts`

---

## Quick Deployment Checklist

- [ ] Firebase CLI installed (`firebase --version`)
- [ ] Logged in to Firebase (`firebase login`)
- [ ] Project linked (`.firebaserc` has correct project ID)
- [ ] Firestore enabled in Firebase Console
- [ ] Deploy rules: `firebase deploy --only firestore:rules`
- [ ] Deploy indexes: `firebase deploy --only firestore:indexes` (after T026)
- [ ] Verify deployment: `firebase firestore:rules get`
- [ ] Run contract tests: `npm test -- tests/contract`

---

## Current Status

✅ Created `firebase.json` - Firebase configuration
✅ Created `.firebaserc` - Project alias (set to `adherence-pro`)
✅ Created `firestore.rules` - Security rules (T025)
⏳ Pending `firestore.indexes.json` - Composite indexes (T026)

---

## Next Steps

1. **Install Firebase CLI** (if not installed)
2. **Login to Firebase**: `firebase login`
3. **Deploy rules**: `firebase deploy --only firestore:rules`
4. **Continue with T026** to create indexes file
5. **Deploy indexes**: `firebase deploy --only firestore:indexes`

---

## Commands Summary

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# List projects
firebase projects:list

# Link project
firebase use --add

# Deploy rules only
firebase deploy --only firestore:rules

# Deploy indexes only
firebase deploy --only firestore:indexes

# Deploy both
firebase deploy --only firestore

# View deployed rules
firebase firestore:rules get

# Test locally
firebase emulators:start --only firestore
```
