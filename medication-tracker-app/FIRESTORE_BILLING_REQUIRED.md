# Enable Firestore - Billing Required

## ⚠️ Issue: Billing Not Enabled

Firebase requires a billing account to use Firestore, even on the **free Spark plan** (which includes generous free quotas).

**Don't worry** - you won't be charged unless you exceed the free tier limits, which are very generous for development:

### Free Tier Limits (Spark Plan)
- **Stored data**: 1 GB
- **Document reads**: 50,000 per day
- **Document writes**: 20,000 per day
- **Document deletes**: 20,000 per day

For your medication tracker app in development, you'll stay well within these limits! 🎉

---

## 🚀 Solution: Enable Firestore via Firebase Console

The easiest way is through the Firebase Console (no billing setup needed via CLI):

### Step 1: Go to Firebase Console
👉 **Open**: https://console.firebase.google.com/project/adherence-pro/firestore

### Step 2: Create Firestore Database

1. Click **"Create database"** button
2. **Choose "Start in production mode"** 
   - We have security rules ready (`firestore.rules`)
   - This prevents open access while we deploy rules
3. **Select location**: `asia-southeast1 (Singapore)`
   - ⚠️ **Important**: Cannot be changed after creation!
4. Click **"Enable"**

### Step 3: Set Up Billing (Required)

Firebase will prompt you to enable billing:

1. Click **"Upgrade project"** or **"Set up billing"**
2. Select or create a **Google Cloud Billing Account**
3. Choose **"Spark plan"** (FREE)
   - You can add a payment method but won't be charged on free tier
   - Optional: Set up budget alerts to notify if you approach limits
4. Confirm and enable billing

Wait 1-2 minutes for setup to complete...

### Step 4: Deploy Security Rules

Once Firestore is enabled, return to terminal and run:

```bash
cd /Users/maax/Projects/side/adherence-pro/medication-tracker-app
/usr/local/bin/firebase deploy --only firestore:rules
```

---

## ✅ Expected Output After Successful Deployment

```
=== Deploying to 'adherence-pro'...

i  deploying firestore
i  firestore: checking firestore.rules for compilation errors...
✔  firestore: rules file firestore.rules compiled successfully
i  firestore: uploading rules firestore.rules...
✔  firestore: released rules firestore.rules to cloud.firestore

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/adherence-pro/overview
```

---

## 🔐 Why Production Mode?

Starting in **production mode** (not test mode) is correct because:

✅ We have comprehensive security rules ready (`firestore.rules`)
✅ Prevents accidental open access to your database
✅ Our rules enforce:
- Authentication required
- Owner-based access control
- Caregiver permissions
- 24-hour edit windows
- FHIR validation

**Test mode** would allow open access for 30 days - not secure!

---

## 💰 About Billing & Free Tier

### Free Tier Includes:
- **1 GB storage** - Enough for ~10,000 medications with full FHIR data
- **50,000 reads/day** - Supports ~100 active users checking schedules
- **20,000 writes/day** - Supports ~500 medication logs per day
- **10 GB/month network egress**

### When Would You Be Charged?
Only if you exceed free tier limits. For example:
- More than 50,000 document reads per day
- More than 1 GB of stored data
- Very unlikely during development!

### Cost Protection:
- Set up **budget alerts** in Google Cloud Console
- Monitor usage in Firebase Console > Usage tab
- Free tier resets daily (reads/writes) or monthly (storage)

---

## 📊 Quick Links

1. **Enable Firestore**: https://console.firebase.google.com/project/adherence-pro/firestore
2. **Set up Billing**: https://console.firebase.google.com/project/adherence-pro/usage/details
3. **View Usage**: https://console.firebase.google.com/project/adherence-pro/usage
4. **Billing Settings**: https://console.cloud.google.com/billing

---

## 🆘 Troubleshooting

### "I don't want to add a payment method"

Unfortunately, Google Cloud requires a billing account for Firestore. However:
- You can use Firebase's free tier indefinitely
- No charges unless you exceed generous free limits
- You can set spending limits and budget alerts
- Development usage will stay within free tier

### Alternative: Use Firebase Local Emulator

If you want to develop without billing:

```bash
# Start local emulator (no billing needed)
/usr/local/bin/firebase emulators:start --only firestore

# Run your app against local emulator
# Configure in src/config/firebase.ts to use localhost
```

**But** for production deployment, you'll need billing enabled.

---

## 📝 After Firestore is Enabled

Run these commands:

```bash
# 1. Deploy security rules
/usr/local/bin/firebase deploy --only firestore:rules

# 2. Verify rules deployed
/usr/local/bin/firebase firestore:rules get

# 3. Continue with T026 (indexes)
# Create firestore.indexes.json, then:
/usr/local/bin/firebase deploy --only firestore:indexes

# 4. Deploy both together (future updates)
/usr/local/bin/firebase deploy --only firestore
```

---

## ✨ Summary

1. **Open Firebase Console**: https://console.firebase.google.com/project/adherence-pro/firestore
2. **Create Database**: Choose production mode, location `asia-southeast1`
3. **Enable Billing**: Set up billing account (Spark plan - FREE)
4. **Deploy Rules**: Run `/usr/local/bin/firebase deploy --only firestore:rules`
5. **Celebrate**: Your database is now secure! 🎉

The free tier is very generous - you won't be charged during development!
