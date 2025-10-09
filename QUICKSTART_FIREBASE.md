# 🚀 Quick Start: Firebase New Project Setup

**Goal**: Set up fresh Firebase project with new Google account  
**Time**: 30-40 minutes  
**Status**: Ready to execute

---

## 🎯 Two Options to Choose From

### Option 1: Interactive Script (Recommended)
Guided setup with automatic configuration:

```bash
cd /Users/maax/Projects/side/adherence-pro
./scripts/setup-firebase.sh
```

The script will:
- ✅ Guide you through Firebase Console steps
- ✅ Update `.firebaserc` automatically
- ✅ Deploy rules and indexes
- ✅ Rebuild native projects
- ✅ Verify everything is configured

---

### Option 2: Manual Setup
Follow step-by-step guide:

```bash
cd /Users/maax/Projects/side/adherence-pro
open FIREBASE_NEW_PROJECT_SETUP.md
```

Complete guide with screenshots and troubleshooting.

---

## 📋 What You'll Do

### In Firebase Console (15 minutes)
1. Create new Firebase project
2. Enable Authentication (Email/Password)
3. Create Firestore database (Singapore region)
4. Enable Cloud Messaging
5. Add iOS app → Download `GoogleService-Info.plist`
6. Add Android app → Download `google-services.json`

### In Your Terminal (15 minutes)
1. Login to Firebase CLI with new account
2. Update `.firebaserc` with new project ID
3. Replace config files (iOS + Android)
4. Deploy Firestore rules and indexes
5. Rebuild native projects
6. Test everything works

---

## 🏁 Quick Start (3 Commands)

If you want to jump right in:

```bash
# 1. Run the setup script
cd /Users/maax/Projects/side/adherence-pro
./scripts/setup-firebase.sh

# 2. Wait for indexes to build (5-10 min), then test
cd medication-tracker-app
npm test

# 3. Start development server
npx expo start
```

---

## ✅ Success Checklist

After setup, verify:
- [ ] Firebase Console shows new project
- [ ] Firestore database exists in Singapore region
- [ ] All 7 indexes show "Enabled" status
- [ ] Can login to Firebase CLI with new account
- [ ] App connects to Firebase without errors
- [ ] Tests pass (or fail as expected per TDD)

---

## 📞 Need Help?

- **Full guide**: `FIREBASE_NEW_PROJECT_SETUP.md`
- **Troubleshooting**: See section "🆘 Troubleshooting" in full guide
- **Firebase Console**: https://console.firebase.google.com/

---

## 📁 Files That Will Change

| File | What Changes |
|------|--------------|
| `.firebaserc` | Updated with new project ID |
| `android/app/google-services.json` | New project config |
| `ios/GoogleService-Info.plist` | New project config |

**Backup**: Old files will be saved as `.old` automatically

---

## ⏱️ Timeline

| Step | Time | Location |
|------|------|----------|
| Create Firebase project | 5 min | Firebase Console |
| Enable services | 5 min | Firebase Console |
| Download config files | 5 min | Firebase Console |
| Update local project | 5 min | Terminal |
| Deploy rules/indexes | 5 min | Terminal |
| Rebuild app | 5 min | Terminal |
| Test | 10 min | Terminal + App |
| **Total** | **40 min** | |

---

## 🎉 Ready?

Choose your path:
- **Interactive**: `./scripts/setup-firebase.sh`
- **Manual**: Open `FIREBASE_NEW_PROJECT_SETUP.md`

Let's go! 🚀
