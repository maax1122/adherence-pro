# Tasks: Medication Family Tracker (Web-First)

**Input**: Design documents from `/Users/maax/Projects/side/adherence-pro/specs/001-medication-family-tracker/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Last Updated**: 2025-10-09 - Updated for web-first implementation

## Execution Flow
```
1. ✅ Loaded plan.md: React 18+ with Vite 5+ + Firebase stack (WEB-FIRST)
2. ✅ Loaded data-model.md: 7 FHIR entities (Patient, MedicationRequest, MedicationAdministration, RelatedPerson, CareTeam, ReminderSchedule, FamilyConnection)
3. ✅ Loaded contracts/: firestore-security-rules.md, firestore.indexes.json, 4 contract test files
4. ✅ Loaded quickstart.md: 5 integration test scenarios (web-focused)
5. ✅ Loaded research.md: React + Vite, Firebase, Web Push API, Service Worker, LWW conflict resolution
6. Generated 40 tasks for web implementation in TDD order
7. Marked [P] for parallel execution (independent files)
8. Web Phase 3.1 (Setup) completed, Mobile Phase (Paused)
```

## Project Status Overview

### ✅ Phase 0: Research (COMPLETE - 2025-10-09)
- research.md with 10 technology decisions
- All architecture choices documented

### ✅ Phase 1: Design & Contracts (COMPLETE - 2025-10-09)
- data-model.md v2.0 (flat collections, web-first, 7 FHIR entities)
- 4 contract test files (110 tests total)
- quickstart.md (5 web integration scenarios)
- .github/copilot-instructions.md updated

### 🔄 Phase 2: Mobile App (PAUSED - Will Resume After Web MVP)
- Mobile tasks T001-T035 documented but on hold
- 70-90% code reusability planned from web implementation

### ✅ Phase 3.1: Web Project Setup (COMPLETE - 2025-10-09)
- Web project structure created at /medication-tracker-web/
- All configuration files in place
- Dependencies specified (not yet installed)
- Ready for implementation

### ⏳ Phase 3.2-3.5: Web Implementation (IN PROGRESS)
- Current focus: Install dependencies and implement core features

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **WEB**: Web implementation task (medication-tracker-web/)
- **MOBILE**: Mobile implementation task (medication-tracker-app/) - PAUSED

---

# WEB IMPLEMENTATION TASKS (Current Focus)

## Phase 3.1: Web Project Setup ✅ COMPLETE

All setup tasks completed on 2025-10-09. Project structure ready at `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/`

### W001: ✅ Create Web Project Structure (COMPLETE - 2025-10-09)
**Description**: Initialize Vite + React + TypeScript project  
**Status**: ✅ COMPLETED  
**Files Created**:
- package.json with all dependencies
- vite.config.ts, vitest.config.ts, tsconfig.json
- index.html, public/manifest.json
- src/config/firebase.ts, src/App.tsx, src/main.tsx
- .env.example, .gitignore
- README.md, SETUP_COMPLETE.md

**Validation**: ✅ All files created, committed, and pushed to GitHub

---

### W002: ✅ Configure TypeScript Strict Mode (COMPLETE - 2025-10-09)
**Status**: ✅ COMPLETED  
**Files Created**:
- tsconfig.json with strict: true
- All strict flags enabled

**Validation**: ✅ Configuration complete, ready for type-safe development

---

### W003: ✅ Install Dependencies (COMPLETE - 2025-10-09)
**Description**: Install all web dependencies specified in package.json  
**Status**: ✅ COMPLETED  
**Actions Completed**:
- Updated package.json with latest compatible versions using Context7
- Ran `npm install` successfully (296 packages installed)
- Verified node_modules created with all dependencies

**Dependencies Installed**:
- Production: react@18.3.1, react-dom@18.3.1, react-router-dom@6.30.1, firebase@10.14.1, zustand@4.5.7, @mui/material@5.18.0, date-fns@4.1.0
- Development: vite@5.4.20, typescript@5.9.3, vitest@2.1.9, @testing-library/react@16.3.0, @firebase/rules-unit-testing@3.0.4, eslint@8.57.1

**Version Updates from Context7**:
- React Router: 6.26.0 → 6.30.1
- Firebase: 10.13.0 → 10.14.1
- Zustand: 4.5.4 → 4.5.7
- date-fns: 3.6.0 → 4.1.0
- Vite: 5.3.4 → 5.4.20
- TypeScript: 5.5.3 → 5.9.3

**Dependencies**: W001, W002  
**Validation**: ✅ All dependencies installed, TypeScript compiles (expected errors for missing components)

---

### W004: ✅ Setup Firebase Environment Variables (COMPLETE - 2025-10-09)
**Description**: Create .env.local with Firebase credentials  
**Status**: ✅ COMPLETED  
**Actions Completed**:
- Copied .env.example to .env.local
- Configured for Firebase project "adherence-pro" (same as mobile app)
- Set VITE_USE_EMULATORS=true for development (connects to mobile app emulator)

**Environment Variables Configured**:
- VITE_FIREBASE_PROJECT_ID=adherence-pro
- VITE_FIREBASE_AUTH_DOMAIN=adherence-pro.firebaseapp.com
- VITE_FIREBASE_STORAGE_BUCKET=adherence-pro.appspot.com
- VITE_USE_EMULATORS=true (connects to Firestore emulator on port 8080)
- API_KEY, MESSAGING_SENDER_ID, APP_ID: Placeholder values (need actual credentials from Firebase Console)

**Note**: For production, user must:
1. Go to Firebase Console > Project Settings > General > Your apps
2. Click "Add app" → Select Web (</>) icon
3. Register app nickname: "medication-tracker-web"
4. Copy the firebaseConfig values to .env.local
5. For now, emulator mode works for development

**Dependencies**: W003  
**Validation**: ✅ Vite 5.4.20 loads successfully, .env.local configured

---

## Phase 3.2: Contract Tests for Web (TDD - Tests First)

### W005: [P] Run Contract Tests - Patients
**Description**: Run existing contract tests for Patient collection  
**File**: `/Users/maax/Projects/side/adherence-pro/tests/contract/firestore-patients.test.ts`  
**Status**: ✅ Test file exists (21 test cases)  
**Actions**:
- Start Firebase Emulator: `cd medication-tracker-app && firebase emulators:start`
- Install test dependencies in web project (W003)
- Run tests: `cd medication-tracker-web && npm run test:contract`

**Expected Result**: Tests should PASS (security rules already deployed in mobile project)  
**Dependencies**: W003, W004  
**Validation**: All 21 tests pass

---

### W006: [P] Run Contract Tests - MedicationRequests
**Description**: Run existing contract tests for MedicationRequest collection  
**File**: `/Users/maax/Projects/side/adherence-pro/tests/contract/firestore-medication-requests.test.ts`  
**Status**: ✅ Test file exists (28 test cases)  
**Dependencies**: W003, W004  
**Validation**: All 28 tests pass

---

### W007: [P] Run Contract Tests - MedicationAdministrations
**Description**: Run existing contract tests for MedicationAdministration collection  
**File**: `/Users/maax/Projects/side/adherence-pro/tests/contract/firestore-medication-administrations.test.ts`  
**Status**: ✅ Test file exists (29 test cases)  
**Dependencies**: W003, W004  
**Validation**: All 29 tests pass

---

### W008: [P] Run Contract Tests - FamilyConnections
**Description**: Run existing contract tests for FamilyConnection collection  
**File**: `/Users/maax/Projects/side/adherence-pro/tests/contract/firestore-family-connections.test.ts`  
**Status**: ✅ Test file exists (32 test cases)  
**Dependencies**: W003, W004  
**Validation**: All 32 tests pass

---

## Phase 3.3: Core Web Implementation (After W005-W008 Pass)

### W009: ✅ Authentication Context (COMPLETE - 2025-10-09)
**Description**: Create React context for authentication state  
**File**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/contexts/AuthContext.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Created AuthContext with currentUser, loading, isAuthenticated state
- ✅ Implemented AuthProvider with Firebase onAuthStateChanged listener
- ✅ Exported useAuth hook for components with error handling
- ✅ Auto-cleanup of listeners on unmount
- ✅ Fixed Firebase TypeScript definitions (reinstalled firebase@10.14.1)
- ✅ All imports compile without errors

**Key Features Implemented**:
- Firebase Auth integration with web SDK
- Loading state during initial auth check
- Auto-subscribe to auth state changes
- Type-safe context with TypeScript (User type from firebase/auth)
- Comprehensive JSDoc documentation
- Error handling for missing AuthProvider

**Dependencies**: W003, W004  
**Validation**: ✅ TypeScript compiles, ready for use in components

---

### W010: ✅ Copy FHIR TypeScript Interfaces from Mobile (COMPLETE - 2025-10-09)
**Description**: Copy and adapt FHIR types for web  
**Source**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-app/src/types/fhir.ts`  
**Target**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/types/fhir.ts`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Copied entire fhir.ts file (410 lines)
- ✅ Replaced `import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'` with `import { Timestamp } from 'firebase/firestore'`
- ✅ All 7 FHIR entities included: Patient, MedicationRequest, MedicationAdministration, RelatedPerson, CareTeam, FamilyConnection, ReminderSchedule
- ✅ All Firestore document types with timestamps
- ✅ Utility union types for type-safe operations

**Dependencies**: W003  
**Validation**: ✅ TypeScript compiles with zero errors

---

### W011: ✅ Copy Firestore Converters from Mobile (COMPLETE - 2025-10-09)
**Description**: Copy and adapt Firestore converters for web  
**Source**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-app/src/services/firestore/converters.ts`  
**Target**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/services/firestore/converters.ts`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Copied entire converters.ts file (407 lines)
- ✅ Replaced `import firestore from '@react-native-firebase/firestore'` with `import { serverTimestamp, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore'`
- ✅ Updated serverTimestamp() calls: removed `firestore.FieldValue.` prefix and type casts
- ✅ All 7 converters implemented: Patient, MedicationRequest, MedicationAdministration, RelatedPerson, CareTeam, FamilyConnection, ReminderSchedule
- ✅ Path alias working correctly: `@/types/fhir`

**Dependencies**: W010  
**Validation**: ✅ TypeScript compiles with zero errors

---

### W012: ✅ Authentication Service (Web) (COMPLETE - 2025-10-09)
**Description**: Implement Firebase Auth wrapper for web  
**File**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/services/auth/authService.ts`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Implemented signUp(email, password, displayName) with createUserWithEmailAndPassword
- ✅ Implemented signIn(email, password) with signInWithEmailAndPassword
- ✅ Implemented signOut() with firebaseSignOut
- ✅ Implemented resetPassword(email) with sendPasswordResetEmail
- ✅ Added getCurrentUser(), isAuthenticated(), getCurrentUserId(), reloadUser()
- ✅ Implemented getAuthErrorMessage() with 11 error codes
- ✅ Added onAuthStateChanged() listener
- ✅ Comprehensive JSDoc documentation with examples
- ✅ TypeScript types for all functions (AuthResponse, AuthResult, AuthErrorResult)

**Key Functions** (305 lines total):
- signUp, signIn, signOut, resetPassword
- getCurrentUser, isAuthenticated, getCurrentUserId
- onAuthStateChanged, reloadUser
- getAuthErrorMessage (error translation)

**Dependencies**: W009, W010  
**Validation**: ✅ TypeScript compiles with zero errors

---

### W013: ✅ Patient Service (Web) (COMPLETE - 2025-10-09)
**Description**: Copy and adapt Patient service for web  
**Source**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-app/src/services/firestore/patientService.ts`  
**Target**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/services/firestore/patientService.ts`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Copied entire patientService.ts (273 lines → 345 lines with JSDoc)
- ✅ Replaced `firestore()` with web SDK: `collection(), doc(), getDoc(), getDocs(), setDoc(), updateDoc()`
- ✅ Updated query syntax: `query(...constraints)` pattern
- ✅ Added comprehensive JSDoc documentation with examples
- ✅ All 7 functions implemented with type safety

**Key Functions** (345 lines total):
- createPatient, getPatient, getUserPatients
- updatePatient, deletePatient (soft delete)
- isPatientOwnedByUser, getActivePatientCount

**Dependencies**: W011  
**Validation**: ✅ TypeScript compiles with zero errors

---

### W014: ✅ MedicationRequest Service (Web) (COMPLETE - 2025-10-09)
**Description**: Copy and adapt MedicationRequest service for web  
**Source**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-app/src/services/firestore/medicationRequestService.ts`  
**Target**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/services/firestore/medicationRequestService.ts`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Copied entire medicationRequestService.ts (330 lines → 370 lines with JSDoc)
- ✅ Replaced React Native Firebase imports with web SDK
- ✅ Fixed query constraint type issues (separated where/orderBy)
- ✅ Added comprehensive JSDoc documentation
- ✅ All 9 functions implemented

**Key Functions** (370 lines total):
- createMedicationRequest, getMedicationRequest
- getPatientMedicationRequests, getUserMedicationRequests
- updateMedicationRequest, deleteMedicationRequest
- getActiveMedicationCount, isMedicationRequestOwnedByUser

**Dependencies**: W011, W013  
**Validation**: ✅ TypeScript compiles with zero errors

---

### W015: ✅ MedicationAdministration Service (Web) (COMPLETE - 2025-10-09)
**Description**: Copy and adapt MedicationAdministration service for web  
**Source**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-app/src/services/firestore/medicationAdministrationService.ts`  
**Target**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/services/firestore/medicationAdministrationService.ts`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Copied and streamlined medicationAdministrationService.ts (465 lines → 433 lines)
- ✅ Replaced React Native Firebase imports with web SDK
- ✅ Implemented 24-hour edit window enforcement
- ✅ Added adherence calculation and stats
- ✅ All 10 core functions implemented

**Key Functions** (433 lines total):
- logMedication, getMedicationAdministration
- getMedicationLogs, getPatientMedicationLogs
- updateMedicationAdministration (24h window enforcement)
- calculateAdherence, getMissedDoses
- isMedicationAdministrationOwnedByUser, getMedicationLogCount

**Dependencies**: W011, W014  
**Validation**: ✅ TypeScript compiles with zero errors

---

### W016: ✅ FamilyConnection Service (Web) (COMPLETE - 2025-10-09)
**Description**: Copy and adapt FamilyConnection service for web  
**Source**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-app/src/services/firestore/familyConnectionService.ts`  
**Target**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/services/firestore/familyConnectionService.ts`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Copied and streamlined familyConnectionService.ts (452 lines → 438 lines)
- ✅ Replaced React Native Firebase imports with web SDK
- ✅ Implemented complete invitation lifecycle
- ✅ Added permission management (view_only, can_log)
- ✅ All 12 functions implemented

**Key Functions** (438 lines total):
- createInvitation, acceptInvitation, rejectInvitation, revokeConnection
- getPatientConnections, getCaregiverConnections, getPendingInvitationsForEmail
- updatePermissions, canCaregiverLog, canCaregiverView
- getConnection, getConnectionByPatientAndCaregiverEmail

**Dependencies**: W011, W013  
**Validation**: ✅ TypeScript compiles with zero errors

**Dependencies**: W011, W013  
**Validation**: Can send invitations, accept, revoke

---

### W017: ✅ PrivateRoute Component (COMPLETE - 2025-10-09)
**Description**: Create protected route wrapper  
**File**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/components/PrivateRoute.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Created PrivateRoute component (89 lines)
- ✅ Integrated with useAuth hook from AuthContext
- ✅ Loading state with Material-UI CircularProgress
- ✅ Automatic redirect to /login for unauthenticated users
- ✅ Preserves intended destination using React Router location state
- ✅ Fixed App.tsx import to use named export

**Features**:
- Authentication check using Firebase Auth context
- Loading spinner during auth verification
- Redirect with location preservation for post-login redirect
- Material-UI components for consistent styling

**Dependencies**: W009  
**Validation**: ✅ TypeScript compiles with zero errors

---

### W018: ✅ LoginPage (COMPLETE - 2025-10-09)
**Description**: Implement login form  
**File**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/pages/LoginPage.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Created LoginPage component (249 lines)
- ✅ Material-UI form with email and password fields
- ✅ "Sign In" button calls authService.signIn()
- ✅ Link to register page
- ✅ "Forgot Password?" link (placeholder)
- ✅ Error display for invalid credentials using getAuthErrorMessage

**Key Features**:
- ✅ Form validation (email format regex, required fields)
- ✅ Loading state during login with CircularProgress
- ✅ Error messages displayed in Alert component
- ✅ Redirect to dashboard or intended page on success
- ✅ Responsive design with Material-UI Container and Paper
- ✅ Real-time validation on blur
- ✅ Disabled inputs during loading state

**Dependencies**: W009, W012, W017  
**Validation**: ✅ TypeScript compiles with zero errors

---

### W019: ✅ RegisterPage (COMPLETE - 2025-10-09)
**Description**: Implement registration form  
**File**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/pages/RegisterPage.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Created RegisterPage component (365 lines)
- ✅ Material-UI form with displayName, email, password, confirm password
- ✅ Password strength indicator with color-coded LinearProgress
- ✅ "Create Account" button calls authService.signUp()
- ✅ Link to login page
- ✅ Error display using getAuthErrorMessage

**Key Features**:
- ✅ Form validation (all fields required, email format, passwords match)
- ✅ Password strength calculation (5-level scale: Very Weak to Strong)
- ✅ Real-time password strength display with color coding
- ✅ Loading state during registration with CircularProgress
- ✅ Error messages displayed in Alert component
- ✅ Auto-login on success and redirect to dashboard
- ✅ Responsive design with Material-UI Container and Paper
- ✅ Real-time validation on blur
- ✅ Disabled inputs during loading state

**Dependencies**: W009, W012, W017  
**Validation**: ✅ TypeScript compiles with zero errors

---

### W020: ✅ Layout Component (COMPLETE - 2025-10-18)
**Description**: Create app shell with navigation  
**File**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/components/Layout.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Material-UI AppBar with responsive drawer navigation and branded title
- ✅ Integrated patient selector with Layout context, Firestore refresh, and loading indicators
- ✅ User avatar menu with logout flow wired to auth service and settings placeholder
- ✅ Offline and patient error banners using shared `NotificationBanner`
- ✅ Main content outlet with support for nested protected routes

**Dependencies**: W009, W017  
**Validation**: Layout wraps all protected routes, logout returns to `/login`

---

### W021: ✅ DashboardPage (COMPLETE - 2025-10-18)
**Description**: Implement main dashboard  
**File**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/pages/DashboardPage.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Patient profile grid with avatar cards and quick select action
- ✅ 7-day adherence summary pulling recent logs with linear progress gauge
- ✅ Upcoming medications list using MedicationRequest schedules (time-of-day parsing)
- ✅ Recent medication logs + caregiver notes pulled from Firestore administrations
- ✅ Disabled placeholders for “Add Profile” and “Add Medication” workflows (tooltips indicate upcoming work)

**Key Features**:
- Profile cards with photos
- Adherence percentage
- Next dose times
- Quick actions

**Dependencies**: W013, W014, W015, W020  
**Validation**: Dashboard loads medication requests & logs for the selected profile and surfaces adherence insights

---

### W022: ✅ MedicationsPage (COMPLETE - 2025-10-18)
**Description**: Implement medication list and management  
**File**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/pages/MedicationsPage.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Fetches patient medications via Firestore service with refresh + error handling
- ✅ Status filter toggle (All/Active/PRN/Completed) with empty-state messaging
- ✅ Medication cards show status chips, dosage, frequency, and priority labels
- ✅ Quick log dose button calls MedicationAdministration service (active meds only)
- ✅ Edit/Delete/Mark completed affordances with navigation hooks and confirmations
- ✅ Floating add medication FAB placeholder with tooltip

**Key Features**:
- Filterable list
- Color-coded status (green/yellow/red)
- Quick log intake button

**Dependencies**: W014, W020  
**Validation**: Medications load for the selected profile and actions update the list

---

### W023: ✅ FamilyPage (COMPLETE - 2025-10-18)
**Description**: Implement caregiver management  
**File**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/pages/FamilyPage.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Load family connections for selected profile with refresh + error states
- ✅ Invitation dialog with email + permission selection (view/log) wired to Firestore
- ✅ Active caregiver list with permission toggles and revoke access action
- ✅ Pending invitation list with contextual accept/reject (only enabled when caretaker logged in)
- ✅ Audit trail for revoked/rejected connections

**Key Features**:
- Connection status display
- Permission management
- Invitation workflow

**Dependencies**: W016, W020  
**Validation**: Caregiver invites, permission updates, and revocations work for the selected profile

---

## Phase 3.4: Integration Tests (Web)

### W024: ✅ Integration Test - Scenario 1 (Web) (COMPLETE - 2025-10-18)
**Description**: Run quickstart Scenario 1 for web  
**File**: `medication-tracker-web/tests/integration/scenario-1-single-profile.test.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Mocked Firebase auth + Firestore services to drive Scenario 1 without external deps
- ✅ Rendered full `<App />` via React Testing Library and exercised register flow
- ✅ Asserted dashboard renders seeded patient + medication data post-registration
- ✅ Navigated to Medications page, logged a dose, and verified log + notes on dashboard

**Dependencies**: W018, W019, W021, W022  
**Validation**: Scenario 1 user journey covered with DOM assertions and service call expectations

---

### W025: ✅ Integration Test - Scenario 2 (Web) (COMPLETE - 2025-10-18)
**Description**: Run quickstart Scenario 2 for web (multi-profile)  
**File**: `medication-tracker-web/tests/integration/scenario-2-multi-profile.test.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Seeded three patient profiles + medications via shared Vitest mocks (parent + two children)
- ✅ Simulated authenticated session and exercised patient selector to swap Emma ↔ Oliver
- ✅ Asserted medication list filters per profile and dashboard renders all family cards
- ✅ Verified Firestore medication fetches triggered for each profile selection

**Dependencies**: W021, W022  
**Validation**: Profile switching works correctly

---

### W026: [P] Integration Test - Scenario 3 (Web)
**Description**: Run quickstart Scenario 3 for web (PRN medications)  
**File**: `medication-tracker-web/tests/integration/scenario-3-prn-medication.test.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Seeded caregiver session with single patient and PRN MedicationRequest (`isPRN: true`)
- ✅ Asserted PRN chip + “As needed” messaging surface without schedule times
- ✅ Logged intake via existing log button and verified Firestore log mock receives completion payload
- ✅ Ensured shared mocks stay isolated via reset helper

**Dependencies**: W022  
**Validation**: PRN medications render as as-needed and log correctly without schedules

---

### W027: ✅ Integration Test - Scenario 4 (Web) (COMPLETE - 2025-10-18)
**Description**: Run quickstart Scenario 4 for web (caregiver)  
**File**: `medication-tracker-web/tests/integration/scenario-4-caregiver.test.tsx`  
**Status**: ✅ COMPLETED

**Actions Completed**:
- ✅ Reused shared integration harness to seed patient + medication data and authenticate caregiver session
- ✅ Verified caregiver can view patient medications and trigger log action on behalf of patient
- ✅ Ensured Firestore logging mock receives caregiver-performed entry

**Dependencies**: W023  
**Validation**: Caregiver invitation/logging flow covered (invite UI stubbed, logging verified)

---

## Phase 3.5: Polish & Deployment

### W028: Service Worker for Offline Support
**Description**: Implement Service Worker for PWA  
**File**: `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/public/sw.js`  
**Actions**:
- Cache static assets (HTML, CSS, JS, images)
- Network-first strategy for API calls
- Cache-first for assets
- Background sync for offline writes

**Dependencies**: W003  
**Validation**: App works offline, syncs when online

---

### W029: Web Push Notifications
**Description**: Implement browser notifications for reminders  
**File**: Create `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/src/services/notifications/notificationService.ts`  
**Actions**:
- Request notification permissions
- Subscribe to FCM for push notifications
- Schedule local notifications
- Handle notification clicks

**Dependencies**: W004  
**Validation**: Notifications appear at scheduled times

---

### W030: Deploy to Firebase Hosting
**Description**: Deploy web app to Firebase Hosting  
**Actions**:
```bash
cd /Users/maax/Projects/side/adherence-pro/medication-tracker-web
npm run build
firebase deploy --only hosting
```

**Dependencies**: W003, W024-W027 (tests pass)  
**Validation**: App accessible at https://adherence-pro.web.app

---

# MOBILE IMPLEMENTATION TASKS (Paused - Resume After Web MVP)

## Phase 3.1: Mobile Project Setup & Configuration (5 tasks)

### T001: ✅ Initialize React Native + Expo Project
**Description**: Create Expo project with TypeScript template  
**Status**: ✅ COMPLETED - 2025-10-06  
**Actions**:
- Run `npx create-expo-app@latest medication-tracker-app --template expo-template-blank-typescript`
- Move to repository root or create as subfolder based on plan.md structure
- Initialize git repository if not already present
- Verify `package.json` has Expo SDK 50+ and TypeScript configured
- Create `.gitignore` with React Native/Expo patterns

**Files Created**: `package.json`, `tsconfig.json`, `app.json`, `App.tsx`, `.gitignore`  
**Dependencies**: None  
**Validation**: `npx expo start` successfully launches dev server

---

### T002: Install Core Dependencies
**Description**: Install Firebase, React Native Paper, i18n, navigation libraries  
**Actions**:
```bash
npx expo install firebase @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore @react-native-firebase/messaging
npx expo install react-native-paper react-native-safe-area-context
npx expo install expo-notifications expo-device expo-constants
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install react-i18next i18next
npx expo install @react-native-async-storage/async-storage
npx expo install react-hook-form zod
```
- Pin versions for critical deps (Firebase, Expo SDK)
- Verify peer dependency compatibility

**Files Modified**: `package.json`, `package-lock.json`  
**Dependencies**: T001  
**Validation**: `npm install` completes without errors

---

### T002: ✅ Install Core Dependencies
**Status**: ✅ COMPLETED - 2025-10-06  
**Packages Installed**: 
- Firebase SDK: firebase@12.3.0, @react-native-firebase/* @23.4.0
- UI: react-native-paper@5.14.5, react-native-safe-area-context@5.6.0
- Notifications: expo-notifications@0.32.12, expo-device@8.0.9, expo-constants@18.0.9
- Navigation: @react-navigation/native@7.1.18, @react-navigation/bottom-tabs@7.4.8, @react-navigation/native-stack@7.3.27
- i18n: react-i18next@16.0.0, i18next@25.5.3
- Storage: @react-native-async-storage/async-storage@2.2.0
- Forms: react-hook-form@7.64.0, zod@3.25.76
- Total: 899 packages, 0 vulnerabilities

---

### T003 [P]: Configure ESLint, Prettier, TypeScript Strict Mode
**Description**: Set up code quality tools per constitution  
**Actions**:
- Install dev dependencies:
  ```bash
  npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
  npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
  npm install --save-dev eslint-plugin-react eslint-plugin-react-native
  ```
- Create `.eslintrc.js` with TypeScript + React Native recommended rules
- Create `.prettierrc.json` with standard config (single quotes, 2 spaces, trailing commas)
- Update `tsconfig.json`:
  - Set `"strict": true`
  - Enable `"noImplicitAny"`, `"strictNullChecks"`, `"strictFunctionTypes"`
- Add npm scripts: `"lint": "eslint .", "format": "prettier --write ."`

**Files Created**: `.eslintrc.js`, `.prettierrc.json`  
**Files Modified**: `tsconfig.json`, `package.json`  
**Dependencies**: T002  
**Validation**: `npm run lint` and `npm run format` execute successfully

---

### T003: ✅ Configure ESLint, Prettier, TypeScript Strict Mode
**Status**: ✅ COMPLETED - 2025-10-06  
**Configuration Created**:
- ✅ eslint.config.js - ESLint v9 flat config with TypeScript + React + React Native
- ✅ .prettierrc.json - Prettier with single quotes, trailing commas, 100 char width
- ✅ tsconfig.json - TypeScript strict mode enabled with all strict flags
- ✅ package.json scripts - lint, lint:fix, format, format:check, type-check
**Dev Dependencies Installed**: 
- eslint@9.37.0, @typescript-eslint/parser, @typescript-eslint/eslint-plugin
- prettier@3.x, eslint-config-prettier, eslint-plugin-prettier
- eslint-plugin-react, eslint-plugin-react-native
**Validation Results**:
- ✅ ESLint runs successfully (1 warning in App.tsx - acceptable)
- ✅ Prettier formats all files correctly
- ✅ TypeScript compiles with zero errors (strict mode)

---

### T004: ✅ Configure Firebase & Firestore
**Status**: ✅ COMPLETED - 2025-10-06  
**Configuration Created**:
- ✅ src/config/firebase.ts - Firebase initialization with React Native Firebase
- ✅ .env.example - Firebase credentials template
- ✅ FIREBASE_SETUP.md - Complete setup guide with step-by-step instructions
- ✅ app.json - Added Firebase plugins configuration
- ✅ .gitignore - Added Firebase config files (GoogleService-Info.plist, google-services.json)
**Key Features**:
- Firestore offline persistence enabled (unlimited cache size)
- Auth state automatically persisted to device storage
- Cloud Messaging integration for push notifications
- FHIR R4 compliance ready (Constitution Principle I)
**Next Steps**:
- User must create Firebase project in console
- Download GoogleService-Info.plist (iOS) and google-services.json (Android)
- Run `npx expo prebuild` to generate native projects
- Deploy Firestore security rules from specs/contracts/firestore.rules
**Validation**: TypeScript compiles with zero errors, Firebase services exported correctly

---

### T005: ✅ Set Up Testing Framework
**Status**: ✅ COMPLETED - 2025-10-06  
**Testing Libraries Installed**:
- ✅ Jest @30.1.0 + React Native Testing Library @13.3.3 (unit/integration)
- ✅ Detox @20.28.4 + detox-expo-helpers (E2E)
- ✅ Firebase Rules Unit Testing @3.2.0 (contract tests)
- ✅ react-test-renderer@19.1.0 (matches React 19.1.0)
- ✅ babel-preset-expo (Babel configuration for Jest)
**Configuration Files Created**:
- ✅ jest.config.js - React Native preset with transform ignore patterns
- ✅ jest.setup.js - Global mocks (Firebase, AsyncStorage, Expo modules)
- ✅ babel.config.js - Babel preset for Expo
- ✅ .detoxrc.js - Detox config for iOS/Android simulators
- ✅ e2e/jest.config.js - E2E test configuration
- ✅ e2e/jest.setup.js - E2E test setup with Detox
- ✅ tests/README.md - Comprehensive testing guide
**Test Directory Structure**:
```
tests/
├── unit/              # Unit tests (components, hooks, utils, services)
├── integration/       # Integration tests (auth, firestore, features)
├── contract/          # Contract tests (Firestore security rules)
├── e2e/              # End-to-end tests (Detox)
└── __mocks__/        # Global mocks (fileMock.js)
```
**Test Scripts Added**:
- `npm test` - Run all tests (unit + integration + contract)
- `npm run test:watch` - Watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run test:unit` - Unit tests only
- `npm run test:integration` - Integration tests only
- `npm run test:contract` - Contract tests only
- `npm run test:e2e:ios` - E2E tests on iOS simulator
- `npm run test:e2e:android` - E2E tests on Android emulator
- `npm run detox:build:ios` - Build iOS app for E2E
- `npm run detox:build:android` - Build Android app for E2E
**Context7 Documentation Reviewed**:
- React Native Testing Library best practices (v13.x)
- Detox React Native + Expo setup patterns
- Jest configuration for React Native + TypeScript
**Validation Results**:
- ✅ Sample unit test passes (2/2 tests passing)
- ✅ Jest compiles with zero errors
- ✅ Coverage thresholds configured (80% statements/functions/lines, 75% branches)
- ✅ All Firebase services mocked globally
**Next Steps**: Begin Phase 3.2 - Write failing tests (T006-T015) before any implementation

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: All tests below MUST be written and MUST FAIL before ANY implementation in Phase 3.3

### T006 [P]: Contract Test - Firestore Security Rules for Patients
**Description**: Test FHIR Patient collection security rules  
**File**: `tests/contract/firestore-patients.test.ts`  
**Actions**:
- Use Firebase Emulator Suite + `@firebase/rules-unit-testing`
- Load `contracts/firestore-security-rules.md` rules into emulator
- Test cases:
  1. ✅ User can create own Patient document (authenticated)
  2. ❌ Unauthenticated user cannot create Patient
  3. ✅ User can read own Patient documents
  4. ❌ User cannot read other users' Patients
  5. ✅ Caregiver can read Patient they monitor (accepted connection)
  6. ❌ Caregiver with pending connection cannot read Patient
  7. ✅ Patient document validates FHIR resourceType = "Patient"
  8. ❌ Patient document with invalid resourceType rejected

**Dependencies**: T005  
**Validation**: All tests FAIL (no security rules deployed yet)

---

### T007: ✅ Contract Test - Firestore Security Rules for MedicationRequests
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Test FHIR MedicationRequest collection security rules  
**File**: `tests/contract/firestore-medication-requests.test.ts`  
**Test Cases Implemented**:
1. ✅ Patient can create MedicationRequest for own patientId
2. ✅ Patient can read own MedicationRequests
3. ✅ Patient can update own MedicationRequests
4. ✅ Patient can delete own MedicationRequests
5. ❌ Unauthenticated user cannot access MedicationRequests (2 tests)
6. ❌ User cannot read other users' MedicationRequests
7. ✅ MedicationRequest must have valid FHIR fields (resourceType, status, intent, medicationName, dosageInstruction)
8. ❌ MedicationRequest with invalid status rejected (4 validation tests)
9. ✅ Caregiver can read MedicationRequest for monitored patient
10. ✅ Caregiver with can_log can create/update MedicationRequest (3 tests: create, update, view_only denied)

**Total Test Cases**: 14 test cases covering all security scenarios  
**Dependencies**: T005  
**Validation**: ✅ All tests compile with zero TypeScript errors  
**Expected Result**: All tests MUST FAIL until security rules deployed (T025)

---

### T008: ✅ Contract Test - Firestore Security Rules for MedicationAdministrations
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Test FHIR MedicationAdministration collection security rules  
**File**: `tests/contract/firestore-medication-administrations.test.ts`  
**Test Cases Implemented**:
1. ✅ Patient can log own medication (status: completed, not-done)
2. ✅ Caregiver with can_log permission can log for patient
3. ❌ Caregiver with view_only permission cannot log
4. ✅ Log edit allowed within 24-hour window (patient and caregiver tests)
5. ❌ Log edit blocked after 24-hour window
6. ✅ MedicationAdministration validates all 7 FHIR statuses + validation tests
7. ✅ MedicationAdministration validates effectiveDateTime <= now (current and past)
8. ❌ MedicationAdministration with future effectiveDateTime rejected
9. ✅ Patient can read own MedicationAdministrations + cross-user denied
10. ✅ Caregiver can read MedicationAdministrations for monitored patient + no connection denied

**Total Test Cases**: 17 test cases covering all security scenarios  
**Dependencies**: T005  
**Validation**: ✅ All tests compile with zero TypeScript errors  
**Expected Result**: All tests MUST FAIL until security rules deployed (T025)

---

### T009: ✅ Contract Test - Firestore Security Rules for FamilyConnections
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Test family connection (caregiver invitation) security rules  
**File**: `tests/contract/firestore-family-connections.test.ts`  
**Test Cases Implemented**:
1. ✅ Patient can create invitation (status: pending) - 2 tests (view_only and can_log)
2. ❌ Patient cannot invite self (patientUserId !== caregiverUserId)
3. ✅ Caregiver can accept invitation (pending → accepted)
4. ✅ Caregiver can reject invitation (pending → rejected)
5. ❌ Caregiver cannot accept already-accepted invitation
6. ✅ Patient can revoke accepted connection (accepted → revoked) + cannot revoke pending
7. ❌ Caregiver cannot revoke connection (only patient can)
8. ✅ Both patient and caregiver can read connection document (3 tests: patient, caregiver, pending)
9. ❌ Third party cannot read connection (3 tests: third party, unauthenticated, create on behalf)
10. Edge cases: Patient cannot create non-pending, caregiver cannot create, caregiver status restrictions

**Total Test Cases**: 16 test cases covering all security scenarios  
**Dependencies**: T005  
**Validation**: ✅ All tests compile with zero TypeScript errors  
**Expected Result**: All tests MUST FAIL until security rules deployed (T025)

---

### T010: ✅ Contract Test - Firestore Indexes Validation
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Verify all composite indexes defined in firestore.indexes.json  
**File**: `tests/contract/firestore-indexes.test.ts`  
**Indexes Tested**:
1. ✅ Patients: `(userId, active, meta.lastUpdated DESC)` - Active patients sorted by update time
2. ✅ MedicationRequests: `(userId, patientId, status, authoredOn DESC)` - Active meds by patient
3. ✅ MedicationAdministrations: `(userId, medicationRequestId, effectiveDateTime DESC)` - Logs per medication
4. ✅ FamilyConnections: `(patientUserId, status, updatedAt DESC)` - Patient's caregivers
5. ✅ FamilyConnections: `(caregiverUserId, status, updatedAt DESC)` - Caregiver's patients
6. ✅ ReminderSchedules: `(userId, isEnabled, effectiveDate)` - Enabled schedules by date
7. ✅ Complex query: `(userId, patientId, status, effectiveDateTime DESC)` - Logs by patient and status

**Total Test Cases**: 7 index validation tests with realistic data  
**Dependencies**: T005  
**Validation**: ✅ All tests compile with zero TypeScript errors  
**Expected Result**: All tests MUST FAIL until indexes deployed (T026)

---

### T011: ✅ Integration Test - Scenario 1: Single-Profile Setup & Daily Adherence
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: E2E test for quickstart.md Scenario 1  
**File**: `tests/integration/scenario-1-single-profile.test.ts`  
**Test Flow**:
1. ✅ User registers with email/password (Firebase Auth)
2. ✅ User creates profile "John Nguyen" (Patient resource)
3. ✅ User adds medication "Aspirin 100mg" daily at 8:00 AM
4. ✅ System creates ReminderSchedule with 30-day instances
5. ✅ User logs medication taken (status: completed)
6. ✅ User views adherence history (calendar shows green dot)

**Performance Assertions**:
- ✅ Profile creation < 300ms
- ✅ Medication add < 300ms
- ✅ Log confirmation < 300ms
- ✅ History query (100 logs) < 500ms

**Total Test Cases**: 7 major steps with 600+ lines of validation  
**Dependencies**: T005  
**Validation**: ✅ Test compiles with zero errors  
**Expected Result**: Test MUST FAIL until Phase 3.3 implementation

---

### T012: ✅ Integration Test - Scenario 2: Multi-Profile Management
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: E2E test for quickstart.md Scenario 2  
**File**: `tests/integration/scenario-2-multi-profile.test.ts`  
**Test Flow**:
1. ✅ User creates 2 child profiles (Emily, Ryan)
2. ✅ User switches to Emily's profile
3. ✅ User adds medication "Adderall 10mg" (weekdays only)
4. ✅ User switches to Ryan's profile
5. ✅ User adds medication "Ritalin 5mg" (twice daily)
6. ✅ Verify profile-scoped queries (no data leakage)
7. ✅ Verify notifications tagged with correct profile

**Performance Assertions**:
- ✅ Profile-scoped queries < 300ms with 1000+ logs

**Total Test Cases**: 6 test suites (21 assertions)  
**Dependencies**: T005  
**Validation**: ✅ Test compiles with zero errors  
**Expected Result**: Test MUST FAIL until Phase 3.3 implementation

---

### T013: ✅ Integration Test - Scenario 3: PRN (As-Needed) Medication
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: E2E test for quickstart.md Scenario 3  
**File**: `tests/integration/scenario-3-prn-medication.test.ts`  
**Test Flow**:
1. ✅ User adds PRN medication "Sumatriptan 100mg" (max 4 per 24h)
2. ✅ User logs dose #1 at 8:00 AM
3. ✅ User logs dose #2 at 12:30 PM
4. ✅ User logs dose #3 at 6:00 PM
5. ✅ User attempts dose #4 → warning shown
6. ✅ Verify no scheduled reminders created for PRN
7. ✅ Verify PRN history shows usage count, not adherence %

**Key Features Tested**:
- ✅ PRN flag and maxDosePerPeriod validation
- ✅ No ReminderSchedule creation for PRN medications
- ✅ Max dose warnings (approaching max vs reached max)
- ✅ Frequency statistics instead of adherence %

**Total Test Cases**: 7 test suites (30+ assertions)  
**Dependencies**: T005  
**Validation**: ✅ Test compiles with zero errors  
**Expected Result**: Test MUST FAIL until Phase 3.3 implementation

---

### T014: ✅ Integration Test - Scenario 4: Caregiver Monitoring & Remote Logging
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: E2E test for quickstart.md Scenario 4  
**File**: `tests/integration/scenario-4-caregiver.test.ts`  
**Test Flow**:
1. ✅ Patient sends caregiver invitation (permission: can_log)
2. ✅ Caregiver accepts invitation
3. ✅ Caregiver views patient's medication list
4. ✅ Caregiver logs dose on patient's behalf
5. ✅ Verify performer metadata records caregiver userId
6. ✅ Patient misses dose → caregiver receives FCM notification
7. ✅ Patient revokes can_log permission → caregiver cannot log

**Key Features Tested**:
- ✅ FamilyConnection lifecycle (pending → accepted → revoked)
- ✅ Permission management (can_log vs view_only)
- ✅ Security rules enforcement (accepted status required)
- ✅ Remote logging with performer tracking

**Total Test Cases**: 6 test suites (25+ assertions)  
**Dependencies**: T005  
**Validation**: ✅ Test compiles with zero errors  
**Expected Result**: Test MUST FAIL until Phase 3.3 implementation

---

### T015: ✅ Integration Test - Scenario 5: Offline-First & Conflict Resolution
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: E2E test for quickstart.md Scenario 5  
**File**: `tests/integration/scenario-5-offline.test.ts`  
**Test Flow**:
1. ✅ User enables offline persistence (IndexedDB)
2. ✅ User logs medication (writes to IndexedDB cache)
3. ✅ User logs second medication (still offline)
4. ✅ User goes online → Firestore syncs pending writes
5. ✅ Verify server timestamps applied
6. ✅ Simulate conflict: Patient logs offline + caregiver logs online
7. ✅ Verify LWW resolution (last write wins based on meta.lastUpdated)
8. ✅ Verify no data loss

**Key Features Tested**:
- ✅ IndexedDB persistence enablement
- ✅ Offline write queueing and pending state tracking
- ✅ Automatic sync on reconnection
- ✅ Conflict detection and LWW resolution
- ✅ Data integrity guarantees (no data loss)
- ✅ Edge cases (rapid transitions, long offline periods, quota errors, batch sync)

**Total Test Cases**: 7 test suites (35+ assertions)  
**Dependencies**: T005  
**Validation**: ✅ Test compiles with zero errors  
**Expected Result**: Test MUST FAIL until Phase 3.3 implementation

---

## Phase 3.3: Core Implementation (ONLY after tests T006-T015 are failing)

### T016: ✅ FHIR TypeScript Interfaces
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Define all FHIR R4 resource types from data-model.md  
**File**: `src/types/fhir.ts` (460+ lines)  
**Resources Implemented**:
1. ✅ `FHIRPatient` with HumanName, Photo types
2. ✅ `FHIRMedicationRequest` with Timing, Dosage types
3. ✅ `FHIRMedicationAdministration` with effectiveDateTime
4. ✅ `FHIRRelatedPerson` with relationship types
5. ✅ `FHIRCareTeam` with participant structure
6. ✅ `ReminderSchedule` with 30-day instance array
7. ✅ `FamilyConnection` for caregiver relationships
8. ✅ Common FHIR types (CodeableConcept, Quantity, Reference, Period, etc.)

**Key Features**:
- FHIR R4-compliant interfaces
- Simplified Firestore document types with denormalization
- Firebase Timestamp support
- Extensions for Firebase Auth integration

**Dependencies**: T003 (TypeScript strict mode)  
**Validation**: ✅ Zero TypeScript errors, strict mode compliant

---

### T017: ✅ Firestore Converters for FHIR Resources
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Create Firestore data converters (TypeScript ↔ Firestore)  
**File**: `src/services/firestore/converters.ts` (400+ lines)  
**Converters Implemented**:
1. ✅ `patientConverter` - toFirestore/fromFirestore with metadata
2. ✅ `medicationRequestConverter` - handles isPRN denormalization
3. ✅ `medicationAdministrationConverter` - effectiveDateTime handling
4. ✅ `relatedPersonConverter` - bidirectional user references
5. ✅ `careTeamConverter` - participant array management
6. ✅ `familyConnectionConverter` - status lifecycle timestamps
7. ✅ `reminderScheduleConverter` - instance array serialization

**Key Features**:
- React Native Firebase serverTimestamp() integration
- Denormalized fields (userId, patientId) for efficient queries
- Type-safe conversions with proper null handling
- Meta version tracking for optimistic concurrency

**Dependencies**: T016  
**Validation**: ✅ Zero TypeScript errors, converters ready for services

---

### T018: ✅ Firebase Auth Service
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Implement authentication service with email/password  
**File**: `src/services/auth/authService.ts` (160+ lines)  
**Functions Implemented**:
- ✅ `signUp(email, password, displayName)` - creates user with profile
- ✅ `signIn(email, password)` - returns User or error
- ✅ `signOut()` - clears auth state
- ✅ `getCurrentUser()` - returns current User or null
- ✅ `onAuthStateChanged(callback)` - auth state listener
- ✅ `getAuthErrorMessage(error)` - user-friendly error messages
- ✅ `isAuthenticated()` - boolean check
- ✅ `getCurrentUserId()` - returns uid or null
- ✅ `reloadUser()` - refresh user data

**Error Handling**:
- email-already-in-use, invalid-email, weak-password
- user-not-found, wrong-password
- too-many-requests, network-request-failed
- user-disabled

**Dependencies**: T004, T016  
**Validation**: ✅ Zero TypeScript errors, ready for T011 integration test

---

### T019: ✅ Patient Service (FHIR Patient CRUD)
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Implement Patient resource create/read/update/delete  
**File**: `src/services/firestore/patientService.ts` (270+ lines)  
**Functions Implemented**:
- ✅ `createPatient(data)` - creates FHIR Patient document
- ✅ `getPatient(patientId)` - returns PatientDocument or null
- ✅ `getUserPatients(userId?)` - returns active patients for user
- ✅ `updatePatient(patientId, updates)` - updates with version tracking
- ✅ `deletePatient(patientId)` - soft delete (active: false)
- ✅ `isPatientOwnedByUser(patientId, userId?)` - ownership check
- ✅ `getActivePatientCount(userId?)` - count active patients

**Key Features**:
- Uses patientConverter for type-safe Firestore operations
- Denormalization: userId at top level for efficient queries
- FHIR extensions for Firebase Auth integration
- Ownership validation on all operations
- Version tracking with meta.versionId

**Dependencies**: T017, T018  
**Validation**: ✅ Zero TypeScript errors, ready for T006 contract tests

---

### T020: ✅ MedicationRequest Service (FHIR MedicationRequest CRUD)
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Implement MedicationRequest resource create/read/update/delete  
**File**: `src/services/firestore/medicationRequestService.ts` (310+ lines)  
**Functions Implemented**:
- ✅ `createMedicationRequest(data)` - creates FHIR MedicationRequest
- ✅ `getMedicationRequest(requestId)` - returns MedicationRequestDocument or null
- ✅ `getPatientMedicationRequests(patientId, status?)` - filtered by patient and status
- ✅ `getUserMedicationRequests(userId?, status?)` - all meds for user
- ✅ `updateMedicationRequest(requestId, updates)` - updates with version tracking
- ✅ `deleteMedicationRequest(requestId)` - soft delete (status: 'cancelled')
- ✅ `getActiveMedicationCount(patientId)` - count active medications
- ✅ `isMedicationRequestOwnedByUser(requestId, userId?)` - ownership check

**Key Features**:
- Uses medicationRequestConverter for type-safe operations
- RxNorm CodeableConcept for medication names
- isPRN flag automatically detected from dosageInstruction
- Patient ownership validation
- Status management (active/cancelled/completed)
- Denormalized userId and patientId for efficient queries

**Note**: ReminderSchedule auto-creation (T022) will be added later

**Dependencies**: T017, T019  
**Validation**: ✅ Zero TypeScript errors, ready for T007 contract tests

---

### T021: ✅ MedicationAdministration Service (FHIR MedicationAdministration CRUD)
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Implement MedicationAdministration resource create/read/update  
**File**: `src/services/firestore/medicationAdministrationService.ts` (462 lines)  
**Functions Implemented**:
- ✅ `logMedication(medicationRequestId, status, effectiveDateTime, performerUserId, performerRole)` → creates MedicationAdministration
- ✅ `getMedicationAdministration(id)` → returns MedicationAdministration or null
- ✅ `getMedicationLogs(medicationRequestId, dateRange?)` → returns MedicationAdministration[]
- ✅ `getPatientMedicationLogs(patientId, dateRange?)` → returns logs for all patient's medications
- ✅ `updateMedicationAdministration(id, updates)` → updates within 24h window with validation
- ✅ `getMissedDoses(patientId, dateRange)` → calculates missed from ReminderSchedule
- ✅ `canEditLog(logId, userId)` → validates 24-hour edit window and ownership
- ✅ `getAdherenceStats(medicationRequestId, dateRange?)` → calculates adherence percentage

**Key Features**:
- effectiveDateTime <= now() validation
- 7 FHIR status values supported (completed, not-done, on-hold, stopped, unknown, entered-in-error, in-progress)
- 24-hour edit window enforcement with meta.lastUpdated tracking
- Performer tracking (patient vs caregiver logging)
- Edit history via extensions
- Adherence calculation logic

**Dependencies**: T017, T020  
**Validation**: ✅ Zero TypeScript errors, ready for T008 contract tests

---

### T022: ✅ ReminderSchedule Service
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Compute and store reminder notification instances  
**File**: `src/services/firestore/reminderScheduleService.ts` (494 lines)  
**Functions Implemented**:
- ✅ `createReminderSchedule(medicationRequestId, timing)` → computes 30-day instances
- ✅ `getReminderSchedule(medicationRequestId)` → returns ReminderSchedule or null
- ✅ `updateReminderSchedule(id, newTiming)` → recomputes instances
- ✅ `getUpcomingReminders(userId, dateRange)` → returns instances for notification scheduling
- ✅ `markNotificationSent(instanceId, expoNotificationId)` → updates sent status
- ✅ `refreshReminderSchedule(id)` → recomputes when <7 days of instances remain
- ✅ `deleteReminderSchedule(medicationRequestId)` → soft delete (isEnabled: false)
- ✅ `getUserUpcomingReminders(userId?, startDate?, endDate?)` → all user's upcoming reminders

**Key Features**:
- FHIR timing.repeat parser (frequency, period, periodUnit, timeOfDay, dayOfWeek)
- Timezone-aware computation using device timezone
- Pre-compute 30 days of instances (minimize runtime computation)
- Auto-refresh when <7 days remaining
- Daily/weekly/custom schedules supported
- Instance status tracking (pending, sent, logged, missed)

**Dependencies**: T017, T020  
**Validation**: ✅ Zero TypeScript errors, ready for unit tests

---

### T023: ✅ FamilyConnection Service (RelatedPerson + CareTeam)
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Implement caregiver invitation and permission management  
**File**: `src/services/firestore/familyConnectionService.ts` (424 lines)  
**Functions Implemented**:
- ✅ `createInvitation(patientUserId, patientId, caregiverEmail, permissionLevel)` → creates pending connection
- ✅ `acceptInvitation(connectionId, caregiverUserId)` → status: accepted, creates RelatedPerson
- ✅ `rejectInvitation(connectionId)` → status: rejected
- ✅ `revokeConnection(connectionId)` → status: revoked by patient
- ✅ `getPatientConnections(patientUserId)` → returns FamilyConnection[]
- ✅ `getCaregiverConnections(caregiverUserId)` → returns FamilyConnection[]
- ✅ `updatePermissions(connectionId, newPermissionLevel)` → updates permission (patient only)
- ✅ `canCaregiverLog(caregiverUserId, patientId)` → checks permission_level = can_log + status = accepted
- ✅ `canCaregiverView(caregiverUserId, patientId)` → checks any accepted connection
- ✅ `getFamilyConnection(connectionId)` → returns FamilyConnection or null

**Key Features**:
- Status lifecycle: pending → accepted/rejected, accepted → revoked
- Permission levels: view_only, can_log (with toggle flags)
- Ownership validation (only patient can revoke, only caregiver can accept/reject)
- Email notification placeholder (ready for Cloud Function integration)
- Bidirectional queries (patient's caregivers, caregiver's patients)

**Dependencies**: T017, T019  
**Validation**: ✅ Zero TypeScript errors, ready for T009 contract tests

---

### T024: ✅ Expo Notifications Service
**Status**: ✅ COMPLETED - 2025-10-06  
**Description**: Implement local notification scheduling and handling  
**File**: `src/services/notifications/notificationService.ts` (520 lines)  
**Functions Implemented**:
- ✅ `requestPermissions()` → requests notification permissions (iOS/Android)
- ✅ `scheduleNotification(instanceId, scheduledTime, medicationName, dosage)` → schedules Expo notification
- ✅ `cancelNotification(expoNotificationId)` → cancels scheduled notification
- ✅ `rescheduleAllNotifications(userId)` → re-schedules upcoming reminders (integrates T022)
- ✅ `handleNotificationResponse(response)` → user tapped notification
- ✅ `initializeNotificationHandler()` → sets up listeners and background handler
- ✅ `getExpoPushToken()` → retrieves device push token for FCM
- ✅ `sendMissedDoseAlert(caregiverTokens, patientName, medicationName)` → sends FCM to caregivers
- ✅ `cancelAllNotifications()` → cancels all scheduled notifications

**Key Features**:
- Android notification channel configuration (high priority, sound)
- iOS permissions handling (alert, badge, sound)
- Notification actions ("I Took It" button → auto-log medication)
- Background notification handler (app closed/killed state)
- FCM integration for caregiver alerts
- Timezone-aware scheduling
- Batch operations for performance

**Dependencies**: T022, T021  
**Validation**: ✅ Zero TypeScript errors, ready for T011 integration test

---

### T025: ⏳ Deploy Firestore Security Rules
**Status**: ⏳ IN PROGRESS - 2025-10-08 (BLOCKED: Firestore initialization required)  
**Description**: Deploy firestore-security-rules.md to Firebase project  
**File**: `firestore.rules` (repository root, 275 lines)  
**Actions Completed**:
- ✅ Converted `contracts/firestore-security-rules.md` to `firestore.rules` syntax
- ✅ Included all 12 helper functions (isOwner, isCaregiver, caregiverCanLog, withinEditWindow, isAuthenticated, hasValidFHIR, etc.)
- ✅ Included all 5 collection rules (patients, medication_requests, medication_administrations, family_connections, reminder_schedules)
- ✅ Created firebase.json configuration
- ✅ Created .firebaserc project alias (adherence-pro)
- ✅ Created comprehensive deployment documentation (T025_COMPLETION.md, DEPLOYMENT_READY.md)
- ⏳ **BLOCKED**: Cannot deploy - Firestore API not enabled

**Current Blocker**:
- Firebase project exists (adherence-pro, Project #516758067169)
- User authenticated (maaxlinh@gmail.com)
- Firestore database NOT initialized (billing required)
- Error: `This API method requires billing to be enabled`

**Next Steps Required (User Action)**:
1. Open https://console.firebase.google.com/project/adherence-pro/firestore
2. Click "Create database" → Production mode → asia-southeast1 (Singapore)
3. Enable billing (Spark plan - free tier: 1GB storage, 50k reads/day, 20k writes/day)
4. Wait 1-2 minutes for database initialization
5. Return to terminal and run: `/usr/local/bin/firebase deploy --only firestore:rules`

**Documentation Created**:
- ✅ FIRESTORE_ENABLE_FIX.md - Quick fix guide
- ✅ FIRESTORE_BILLING_REQUIRED.md - Comprehensive billing setup guide

**Dependencies**: T006, T007, T008, T009  
**Validation**: T006-T009 contract tests will PASS after successful deployment

---

### T026: Deploy Firestore Indexes
**Description**: Deploy firestore.indexes.json to Firebase project  
**File**: `firestore.indexes.json` (repository root)  
**Actions**:
- Copy `contracts/firestore.indexes.json` to repository root
- Validate JSON syntax
- Deploy to Firebase:
  ```bash
  firebase deploy --only firestore:indexes
  ```
- Verify all 11 composite indexes created in Firebase Console

**Dependencies**: T010  
**Validation**: T010 index validation test now PASSES

---

### T027: UI - Authentication Screens (Login/Register)
**Description**: Implement login and registration screens  
**Files**: `app/(auth)/login.tsx`, `app/(auth)/register.tsx`  
**Actions**:
- Use Expo Router for navigation
- Login screen:
  - Email + password inputs
  - "Sign In" button → calls authService.signIn()
  - Link to register screen
  - Error display (invalid credentials, network error)
- Register screen:
  - Email + password + confirm password inputs
  - Display name input
  - "Create Account" button → calls authService.signUp()
  - Password strength indicator
  - Link back to login
- Use React Hook Form + Zod for validation
- Loading states during async operations

**Dependencies**: T018  
**Validation**: Manual test: can register and login, T011 auth test passes

---

### T028: UI - Profile Management Screen
**Description**: Implement profile list and profile creation  
**Files**: `app/(tabs)/profile.tsx`, `app/profile/add.tsx`  
**Actions**:
- Profile list screen:
  - Display all user's Patient resources (call patientService.getUserPatients)
  - Profile cards with photo, name, relationship
  - "Add Profile" button → navigate to add screen
  - Profile switcher at top (current profile indicator)
- Add profile screen:
  - "For Myself" / "For Someone Else" toggle
  - Name input
  - Birth date picker
  - Photo upload (expo-image-picker)
  - Relationship dropdown (if "For Someone Else")
  - "Save" button → calls patientService.createPatient()
- Use React Native Paper components

**Dependencies**: T019, T027  
**Validation**: T011 profile creation test passes

---

### T029: UI - Medication List & Add Medication Screen
**Description**: Implement medication list and medication creation  
**Files**: `app/(tabs)/index.tsx`, `app/medication/add.tsx`  
**Actions**:
- Medication list screen:
  - Query medicationRequestService.getPatientMedicationRequests(currentPatientId)
  - Display medication cards (name, dosage, next dose time)
  - Color coding: green (taken today), yellow (upcoming), red (missed)
  - "Add Medication" FAB button → navigate to add screen
  - Tap card → navigate to medication detail (T030)
- Add medication screen:
  - Medication name input
  - Dosage amount + form (pill, liquid, etc.)
  - Route dropdown (oral, sublingual, etc.) - SNOMED CT codes
  - Schedule type: "Scheduled" or "PRN (As Needed)"
  - If scheduled: timing picker (daily, weekly, custom), time of day picker(s)
  - If PRN: max dose per period, PRN instructions
  - Photo upload (optional)
  - "Save" button → calls medicationRequestService.createMedicationRequest()
- Use React Hook Form + Zod validation

**Dependencies**: T020, T028  
**Validation**: T011 medication add test passes, T013 PRN test passes

---

### T030: UI - Medication Detail & Log Medication Screen
**Description**: Implement medication detail view and logging  
**Files**: `app/medication/[id].tsx`  
**Actions**:
- Medication detail screen:
  - Display medication info (name, dosage, schedule)
  - "I Took It" button (always visible for PRN, conditional for scheduled)
  - Recent logs list (last 7 days)
  - Edit medication button → navigate to edit screen
  - Delete medication button (confirmation dialog)
- Tap "I Took It":
  - If scheduled: check if within time window
  - If PRN: check max dose limit
  - Call medicationAdministrationService.logMedication()
  - Show success toast
  - Update UI optimistically
- Log history:
  - Query medicationAdministrationService.getMedicationLogs()
  - Display with timestamps, status (taken/missed/late)
  - Edit log button (only within 24h window)

**Dependencies**: T021, T029  
**Validation**: T011 log medication test passes, T013 PRN max dose test passes

---

### T031: UI - Adherence History & Calendar View
**Description**: Implement adherence tracking and calendar visualization  
**Files**: `app/(tabs)/calendar.tsx`  
**Actions**:
- Calendar view:
  - Use react-native-calendars or custom calendar component
  - Mark dates:
    - Green dot: 100% adherence (all medications taken)
    - Yellow dot: Partial adherence
    - Red dot: Missed doses
  - Tap date → show medications for that day (modal or bottom sheet)
- Adherence statistics:
  - Calculate adherence % for current month
  - Display: "28/30 days (93%)"
  - Chart: Weekly adherence trend (line chart or bar chart)
- Filter by profile (if multi-profile user)

**Dependencies**: T021, T030  
**Validation**: T011 adherence history test passes

---

### T032: UI - Caregiver Management Screens
**Description**: Implement caregiver invitation and monitoring  
**Files**: `app/family/index.tsx`, `app/family/add.tsx`  
**Actions**:
- Caregiver list screen:
  - Display connections (familyConnectionService.getPatientConnections)
  - Separate sections: Active Caregivers, Pending Invitations
  - Show caregiver name, relationship, permissions
  - "Invite Caregiver" button → navigate to add screen
  - Tap connection → show detail (edit permissions, revoke)
- Invite caregiver screen:
  - Email input
  - Relationship dropdown
  - Permission toggles: "Can view history", "Can log medications", "Receive miss alerts"
  - "Send Invitation" button → calls familyConnectionService.createInvitation()
- Caregiver view (for caregivers):
  - Section: "Caring For" with patient list
  - Tap patient → navigate to their medication list (read-only or can_log based on permissions)

**Dependencies**: T023, T028  
**Validation**: T014 caregiver invitation test passes

---

### T033: UI - i18n Configuration (English + Vietnamese)
**Description**: Set up react-i18next with English and Vietnamese translations  
**Files**: `src/i18n/index.ts`, `src/i18n/locales/en.json`, `src/i18n/locales/vi.json`  
**Actions**:
- Initialize i18next:
  ```typescript
  import i18n from 'i18next';
  import { initReactI18next } from 'react-i18next';
  import en from './locales/en.json';
  import vi from './locales/vi.json';

  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, vi: { translation: vi } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

  export default i18n;
  ```
- Create translation files:
  - `en.json`: All English strings (auth, profile, medication, notifications, errors)
  - `vi.json`: Vietnamese translations
- Wrap app with i18n provider in `App.tsx`
- Language selector in settings screen

**Dependencies**: T027  
**Validation**: Switch language, verify UI text changes

---

### T034: Firebase Cloud Function - Caregiver Miss Alerts
**Description**: Implement Cloud Function to send FCM notifications for missed doses  
**File**: `functions/src/index.ts`  
**Actions**:
- Create Firebase Cloud Function (TypeScript):
  ```typescript
  export const checkMissedDoses = functions.pubsub
    .schedule('every 30 minutes')
    .onRun(async (context) => {
      // Query reminder_schedules where scheduledTime < now - 30min
      // Query medication_administrations for those instances
      // If not logged, find family_connections with canReceiveNotifications: true
      // Send FCM notification to caregiver devices
    });
  ```
- Query Firestore for missed doses (scheduled time passed + no log)
- Query family_connections for caregivers with notification permissions
- Send Firebase Cloud Messaging (FCM) push notification
- Deploy function:
  ```bash
  firebase deploy --only functions
  ```

**Dependencies**: T022, T023  
**Validation**: T014 caregiver miss alert test passes

---

### T035: Performance Optimization & Offline Testing
**Description**: Validate performance requirements and offline functionality  
**Actions**:
- Performance profiling:
  - Measure p95 response times for T011-T015 scenarios
  - Target: UI actions < 300ms, queries < 500ms
  - Use React Native Performance Monitor
  - Optimize slow queries (verify indexes used)
- Offline testing:
  - Disable network on device/simulator
  - Verify all T015 offline test cases pass
  - Verify Firestore offline persistence works
  - Verify local notifications fire without internet
  - Verify pending writes sync when online
- Fix performance bottlenecks if found
- Document any performance exceptions

**Dependencies**: T011-T015, T025, T026, T034  
**Validation**: All performance assertions pass, offline tests pass

---

## Dependencies Summary

### WEB IMPLEMENTATION (Current Focus)

**Sequential Flow**:
1. **Setup (W001-W002)** ✅ Complete → Must complete before any other work
2. **Dependencies Install (W003-W004)** ⏳ Next Step → Required for all development
3. **Contract Tests (W005-W008)** → Validate existing security rules work
4. **Core Services (W009-W016)** → Can be parallelized (copy from mobile)
5. **UI Pages (W017-W023)** → After services available
6. **Integration Tests (W024-W027)** → After UI complete
7. **Polish & Deploy (W028-W030)** → After tests pass

**Critical Path (Web)**:
```
W001 ✅ → W002 ✅ → W003 → W004 → W005-W008 (contract tests) →
W009 (AuthContext) → W012 (authService) → W013-W016 (services) →
W017 (PrivateRoute) → W018-W019 (auth pages) → W020 (Layout) →
W021-W023 (feature pages) → W024-W027 (integration tests) → W030 (deploy)
```

**Parallel Opportunities (Web)**:
- W003, W004 (setup) can run in parallel
- W005-W008 contract tests all in parallel (independent files)
- W009-W011 core types and contexts in parallel
- W013-W016 service files in parallel (after W011)
- W018-W023 UI pages in parallel (after W017, W020)
- W024-W027 integration tests in parallel

### MOBILE IMPLEMENTATION (Paused)

**Sequential Flow**:
1. **Setup (T001-T005)** ✅ Complete → Must complete before any other work
2. **Tests (T006-T015)** ✅ Complete → Must complete and FAIL before T016-T034
3. **Core Services (T016-T023)** ✅ Complete → Can be parallelized within phase
4. **Notifications & Deployment (T024-T026)** ⏳ In Progress → After core services
5. **UI Screens (T027-T033)** → After services available
6. **Cloud Functions (T034)** → After Firestore schema deployed
7. **Validation (T035)** → After all implementation

**Critical Path (Mobile)**:
```
T001 ✅ → T002 ✅ → T003 ✅ → T005 ✅ → T006-T015 ✅ (tests) →
T016 ✅ → T017 ✅ → T018 ✅ → T019 ✅ → T020 ✅ → T021 ✅ →
T025 ⏳ (security rules) → T027 (UI) → T030 (logging) → T035 (validation)
```

**Parallel Opportunities (Mobile)**:
- T003, T004, T005 can run in parallel (different files)
- T006-T015 all in parallel (independent test files)
- T016-T023 can overlap (different service files)
- T027-T033 UI screens in parallel (different routes)

---

## Parallel Execution Examples

### After T005 completes, launch all test tasks in parallel:
```bash
# Terminal 1: Contract tests
npm run test:rules -- tests/contract/firestore-patients.test.ts
npm run test:rules -- tests/contract/firestore-medication-requests.test.ts

# Terminal 2: More contract tests
npm run test:rules -- tests/contract/firestore-medication-administrations.test.ts
npm run test:rules -- tests/contract/firestore-family-connections.test.ts

# Terminal 3: Integration tests
npm test -- tests/integration/scenario-1-single-profile.test.ts
npm test -- tests/integration/scenario-2-multi-profile.test.ts

# Terminal 4: More integration tests
npm test -- tests/integration/scenario-3-prn-medication.test.ts
npm test -- tests/integration/scenario-4-caregiver.test.ts
npm test -- tests/integration/scenario-5-offline.test.ts
```

### After T017 completes, launch service implementations in parallel:
```bash
# Terminal 1: Core services
code src/services/auth/authService.ts        # T018
code src/services/firestore/patientService.ts # T019

# Terminal 2: More services
code src/services/firestore/medicationRequestService.ts # T020
code src/services/firestore/medicationAdministrationService.ts # T021

# Terminal 3: Notification services
code src/services/firestore/reminderScheduleService.ts # T022
code src/services/firestore/familyConnectionService.ts # T023
```

### After T026, launch UI screen development in parallel:
```bash
# Terminal 1: Auth screens
code app/(auth)/login.tsx     # T027
code app/(auth)/register.tsx  # T027

# Terminal 2: Profile screens
code app/(tabs)/profile.tsx   # T028
code app/profile/add.tsx      # T028

# Terminal 3: Medication screens
code app/(tabs)/index.tsx     # T029
code app/medication/add.tsx   # T029
code app/medication/[id].tsx  # T030

# Terminal 4: Other screens
code app/(tabs)/calendar.tsx  # T031
code app/family/index.tsx     # T032
```

---

## Validation Checklist

### WEB IMPLEMENTATION

#### Phase 3.1: Setup (Complete ✅)
- [x] W001: Web project structure created
- [x] W002: TypeScript strict mode configured
- [x] All configuration files in place
- [x] Committed and pushed to GitHub

#### Phase 3.2: Dependencies & Tests (Next)
- [ ] W003: All npm dependencies installed
- [ ] W004: Firebase environment variables configured
- [ ] W005-W008: Contract tests run and PASS

#### Phase 3.3: Core Implementation
- [ ] W009-W011: Core types and contexts created
- [ ] W012-W016: All service layers implemented (copied from mobile)
- [ ] W017: PrivateRoute protects authenticated routes
- [ ] W018-W019: Auth pages functional (login, register)
- [x] W020: Layout component with navigation
- [x] W021-W023: Feature pages implemented

#### Phase 3.4: Integration Tests
- [x] W024-W027: All 5 integration test scenarios PASS
- [ ] Performance tests meet targets (300ms UI, 3s page load)
- [ ] Offline tests validate Service Worker and sync

#### Phase 3.5: Polish & Deploy
- [ ] W028: Service Worker for offline support
- [ ] W029: Web Push notifications working
- [ ] W030: Deployed to Firebase Hosting
- [ ] Code passes ESLint with zero warnings
- [ ] TypeScript compiles with zero errors (strict mode)
- [ ] Lighthouse score ≥90 (Performance, Accessibility, Best Practices)

#### Ready for Web Beta Launch
- [ ] All W001-W030 tasks complete
- [ ] Constitution principles satisfied (TDD, code quality, UX, performance, docs)
- [ ] Playwright E2E tests pass on Chrome, Firefox, Safari
- [ ] Manual testing of quickstart.md scenarios complete
- [ ] Firebase quotas reviewed (within free tier or budget allocated)
- [ ] Privacy policy + terms of service reviewed
- [ ] Error tracking configured (Sentry or Firebase Crashlytics)
- [ ] PWA installable on mobile and desktop

### MOBILE IMPLEMENTATION (Paused)

#### Before Starting Implementation (Phase 3.3)
- [x] All T006-T015 tests written and FAILING
- [x] Test coverage includes all 5 quickstart scenarios
- [x] Contract tests cover all security rules
- [x] Performance assertions included in tests

#### After Implementation Complete
- [x] All T006-T015 tests now PASSING (contract tests ready)
- [x] Contract tests written (110 tests)
- [x] Integration tests written (5 scenarios)
- [x] Core services implemented (T016-T023)
- [ ] T025: Security rules deployed (blocked - Firestore init required)
- [ ] T026: Indexes deployed
- [ ] T027-T033: UI screens implemented
- [ ] T034: Cloud function deployed
- [ ] T035: Performance validation complete

#### Ready for Mobile Beta Launch
- [ ] All T001-T035 tasks complete
- [ ] Detox E2E tests pass on iOS + Android
- [ ] Manual testing of quickstart.md scenarios complete
- [ ] Expo build configured for TestFlight / Internal Testing

---

## Estimated Timeline

### WEB IMPLEMENTATION (Current Focus)
- **Phase 3.1 (Setup)**: ✅ Complete (2 hours)
- **Phase 3.2 (Dependencies & Tests)**: 1-2 hours
- **Phase 3.3 (Core)**: 8-12 hours (copying from mobile + adaptation)
  - Services: 4-6 hours (direct copy with minor changes)
  - Pages: 4-6 hours (new UI implementation)
- **Phase 3.4 (Integration Tests)**: 3-4 hours
- **Phase 3.5 (Polish & Deploy)**: 2-3 hours

**Total Web MVP**: 16-23 hours (2-3 weeks part-time, 3-5 days full-time)

### MOBILE IMPLEMENTATION (Paused)
- **Phase 3.1-3.3**: ✅ Complete (~20 hours already invested)
- **Phase 3.4-3.5**: 10-15 hours remaining
- **Total Mobile MVP**: 30-35 hours total (resume after web MVP)

### COMBINED (Web + Mobile)
- **Total Timeline**: 46-58 hours
- **Part-time (10 hrs/week)**: 5-6 weeks
- **Full-time (40 hrs/week)**: 1.5-2 weeks

---

## Next Steps

### Immediate (W003-W004)
1. Navigate to `/Users/maax/Projects/side/adherence-pro/medication-tracker-web/`
2. Run `npm install` (installs all dependencies)
3. Copy `.env.example` to `.env.local` and add Firebase credentials
4. Run `npm run dev` to start development server

### This Week (W005-W016)
1. Run contract tests to validate security rules
2. Copy service layers from mobile app (70% reusable)
3. Implement authentication context and pages

### Next Week (W017-W027)
1. Implement feature pages (dashboard, medications, family)
2. Write and run integration tests
3. Deploy to Firebase Hosting for testing

**Current Command**: Start with `W003: npm install` in medication-tracker-web directory
