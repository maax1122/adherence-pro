#!/bin/bash

#####################################################################
# Firebase New Project Setup - Interactive Checklist
# Guides you through setting up a fresh Firebase project
#####################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Firebase New Project Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$PROJECT_ROOT/medication-tracker-app"

cd "$APP_DIR"

echo "This script will help you set up a fresh Firebase project."
echo "Full guide: $PROJECT_ROOT/FIREBASE_NEW_PROJECT_SETUP.md"
echo ""
read -p "Press Enter to continue..."

# Step 1
echo ""
echo -e "${GREEN}STEP 1: Create Firebase Project${NC}"
echo "1. Go to: https://console.firebase.google.com/"
echo "2. Click 'Add project'"
echo "3. Enter project name and ID"
echo "4. Enable Google Analytics (recommended)"
echo "5. Wait for project creation"
echo ""
read -p "✓ Have you created the Firebase project? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please create the Firebase project first, then run this script again."
    exit 1
fi

read -p "Enter your new Firebase project ID: " PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    echo "Project ID cannot be empty"
    exit 1
fi

# Step 2
echo ""
echo -e "${GREEN}STEP 2: Enable Firebase Services${NC}"
echo "In Firebase Console for project: $PROJECT_ID"
echo ""
echo "2.1 Enable Authentication:"
echo "    - Go to Build → Authentication → Get started"
echo "    - Enable Email/Password provider"
echo ""
echo "2.2 Create Firestore:"
echo "    - Go to Build → Firestore Database → Create database"
echo "    - Production mode"
echo "    - Region: asia-southeast1 (Singapore)"
echo ""
echo "2.3 Enable Cloud Messaging:"
echo "    - Go to Build → Cloud Messaging → Get started"
echo ""
read -p "✓ Have you enabled all services? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please enable all services first, then run this script again."
    exit 1
fi

# Step 3
echo ""
echo -e "${GREEN}STEP 3: Download Client Config Files${NC}"
echo "In Firebase Console → Project Settings → Your apps:"
echo ""
echo "3.1 Add iOS app:"
echo "    - Bundle ID: com.adherencepro.medicationtracker"
echo "    - Download GoogleService-Info.plist"
echo ""
echo "3.2 Add Android app:"
echo "    - Package name: com.adherencepro.medicationtracker"
echo "    - Download google-services.json"
echo ""
read -p "✓ Have you downloaded both config files? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please download the config files first."
    exit 1
fi

echo ""
echo "Please move the downloaded files to:"
echo "  - google-services.json → $APP_DIR/android/app/"
echo "  - GoogleService-Info.plist → $APP_DIR/ios/"
echo ""
read -p "✓ Have you moved both files? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please move the files first."
    exit 1
fi

# Verify files exist
if [ ! -f "android/app/google-services.json" ]; then
    echo "❌ google-services.json not found at android/app/google-services.json"
    exit 1
fi

if [ ! -f "ios/GoogleService-Info.plist" ]; then
    echo "❌ GoogleService-Info.plist not found at ios/GoogleService-Info.plist"
    exit 1
fi

echo "✅ Config files found!"

# Step 4
echo ""
echo -e "${GREEN}STEP 4: Update Firebase CLI Authentication${NC}"
echo "Logging out from old account..."
firebase logout || true

echo ""
echo "Now login with your NEW Google account:"
firebase login

# Step 5
echo ""
echo -e "${GREEN}STEP 5: Update .firebaserc${NC}"
cat > .firebaserc <<EOF
{
  "projects": {
    "default": "$PROJECT_ID"
  }
}
EOF
echo "✅ Updated .firebaserc with project ID: $PROJECT_ID"

# Step 6
echo ""
echo -e "${GREEN}STEP 6: Deploy Firestore Rules and Indexes${NC}"
read -p "Deploy security rules now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    firebase deploy --only firestore:rules
    echo "✅ Security rules deployed!"
fi

read -p "Deploy indexes now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    firebase deploy --only firestore:indexes
    echo "✅ Indexes deployed! (will take 5-10 minutes to build)"
fi

# Step 7
echo ""
echo -e "${GREEN}STEP 7: Rebuild Native Projects${NC}"
read -p "Rebuild with new Firebase config? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running: npx expo prebuild --clean"
    npx expo prebuild --clean
    echo "✅ Native projects rebuilt!"
fi

# Final
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Setup Complete! 🎉${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Wait 5-10 minutes for Firestore indexes to build"
echo "2. Check index status: https://console.firebase.google.com/project/$PROJECT_ID/firestore/indexes"
echo "3. Run tests: npm test"
echo "4. Start dev server: npx expo start"
echo ""
echo "Verification checklist:"
echo "  □ Firebase Console → Authentication shows Email/Password enabled"
echo "  □ Firebase Console → Firestore Database exists (asia-southeast1)"
echo "  □ Firebase Console → Firestore → Rules shows custom rules"
echo "  □ Firebase Console → Firestore → Indexes shows 7 indexes (all enabled)"
echo "  □ Firebase Console → Cloud Messaging enabled"
echo "  □ firebase projects:list shows your project"
echo "  □ App connects to Firebase without errors"
echo ""
echo "Troubleshooting guide: $PROJECT_ROOT/FIREBASE_NEW_PROJECT_SETUP.md"
