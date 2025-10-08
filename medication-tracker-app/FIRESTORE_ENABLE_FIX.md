# Firebase Deployment - Quick Fix for API Error

## Issue
Getting error: "Failed to make request to serviceusage.googleapis.com"

This means Firestore Database hasn't been initialized in your Firebase project yet.

## Solution: Enable Firestore in Firebase Console

### Step 1: Go to Firebase Console
Open: https://console.firebase.google.com/project/adherence-pro

### Step 2: Enable Firestore Database
1. In the left sidebar, click **"Build"** > **"Firestore Database"**
2. Click **"Create database"** button
3. Choose **"Start in production mode"** (we have security rules ready!)
4. Select a location:
   - **Recommended**: `us-central1` (United States)
   - **Or**: Choose closest to your users
   - ⚠️ **Important**: Location cannot be changed later!
5. Click **"Enable"**

Wait 1-2 minutes for Firestore to initialize...

### Step 3: Deploy Security Rules Again

Once Firestore is enabled, run:

```bash
cd /Users/maax/Projects/side/adherence-pro/medication-tracker-app
/usr/local/bin/firebase deploy --only firestore:rules
```

### Step 4: Verify Deployment

```bash
/usr/local/bin/firebase firestore:rules get
```

---

## Alternative: Use Firebase CLI to Enable (If Above Doesn't Work)

```bash
# Enable Firestore API
/usr/local/bin/firebase firestore:databases:create \
  --location=us-central1 \
  --project=adherence-pro
```

---

## Quick Link

👉 **Enable Firestore Now**: https://console.firebase.google.com/project/adherence-pro/firestore

After enabling, come back and run:
```bash
/usr/local/bin/firebase deploy --only firestore:rules
```

---

## What This Does

Enabling Firestore will:
- ✅ Create a Firestore database instance
- ✅ Enable Firestore API for your project
- ✅ Allow security rules deployment
- ✅ Make your database ready for development

Once enabled, the deployment will work! 🚀
