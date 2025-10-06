# Tasks: Medication Family Tracker

**Input**: Design documents from `/Users/maax/Projects/side/adherence-pro/specs/001-medication-family-tracker/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow
```
1. ✅ Loaded plan.md: React Native + Expo SDK 50+ + Firebase stack
2. ✅ Loaded data-model.md: 6 FHIR entities (Patient, MedicationRequest, MedicationAdministration, RelatedPerson, CareTeam, ReminderSchedule)
3. ✅ Loaded contracts/: firestore-security-rules.md, firestore.indexes.json
4. ✅ Loaded quickstart.md: 5 integration test scenarios
5. ✅ Loaded research.md: React Native/Expo, Firebase, Expo Notifications, LWW conflict resolution
6. Generated 35 tasks in TDD order
7. Marked [P] for parallel execution (independent files)
8. Ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths are absolute for clarity

## Phase 3.1: Project Setup & Configuration (5 tasks)

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

### T007 [P]: Contract Test - Firestore Security Rules for MedicationRequests
**Description**: Test FHIR MedicationRequest collection security rules  
**File**: `tests/contract/firestore-medication-requests.test.ts`  
**Actions**:
- Test cases:
  1. ✅ Patient can create MedicationRequest for own patientId
  2. ❌ Patient cannot create MedicationRequest for other patientId
  3. ✅ Caregiver with can_log permission can create MedicationRequest
  4. ❌ Caregiver with view_only permission cannot create MedicationRequest
  5. ✅ MedicationRequest validates status in FHIR value set
  6. ✅ MedicationRequest validates dosageInstruction is array
  7. ❌ MedicationRequest without medicationName rejected
  8. ✅ Patient can update/delete own MedicationRequest
  9. ✅ Caregiver can read MedicationRequest for monitored patient

**Dependencies**: T005  
**Validation**: All tests FAIL (no security rules deployed yet)

---

### T008 [P]: Contract Test - Firestore Security Rules for MedicationAdministrations
**Description**: Test FHIR MedicationAdministration collection security rules  
**File**: `tests/contract/firestore-medication-administrations.test.ts`  
**Actions**:
- Test cases:
  1. ✅ Patient can log own medication (status: completed)
  2. ✅ Caregiver with can_log permission can log for patient
  3. ❌ Caregiver with view_only permission cannot log
  4. ✅ Log edit allowed within 24-hour window
  5. ❌ Log edit blocked after 24-hour window
  6. ✅ MedicationAdministration validates status in FHIR value set
  7. ✅ MedicationAdministration validates effectiveDateTime <= now
  8. ❌ MedicationAdministration with future effectiveDateTime rejected
  9. ✅ Patient can read own MedicationAdministrations
  10. ✅ Caregiver can read MedicationAdministrations for monitored patient

**Dependencies**: T005  
**Validation**: All tests FAIL (no security rules deployed yet)

---

### T009 [P]: Contract Test - Firestore Security Rules for FamilyConnections
**Description**: Test family connection (caregiver invitation) security rules  
**File**: `tests/contract/firestore-family-connections.test.ts`  
**Actions**:
- Test cases:
  1. ✅ Patient can create invitation (status: pending)
  2. ❌ Patient cannot invite self (patientUserId !== caregiverUserId)
  3. ✅ Caregiver can accept invitation (pending → accepted)
  4. ✅ Caregiver can reject invitation (pending → rejected)
  5. ❌ Caregiver cannot accept already-accepted invitation
  6. ✅ Patient can revoke accepted connection (accepted → revoked)
  7. ❌ Caregiver cannot revoke connection (only patient can)
  8. ✅ Both patient and caregiver can read connection document
  9. ❌ Third party cannot read connection

**Dependencies**: T005  
**Validation**: All tests FAIL (no security rules deployed yet)

---

### T010 [P]: Contract Test - Firestore Indexes Validation
**Description**: Verify all composite indexes defined in firestore.indexes.json  
**File**: `tests/contract/firestore-indexes.test.ts`  
**Actions**:
- Parse `contracts/firestore.indexes.json`
- Test each composite index query:
  1. `(userId, active, meta.lastUpdated DESC)` on patients
  2. `(userId, patientId, status, authoredOn DESC)` on medication_requests
  3. `(userId, medicationRequestId, effectiveDateTime DESC)` on medication_administrations
  4. `(patientUserId, status, updatedAt DESC)` on family_connections
  5. `(caregiverUserId, status, updatedAt DESC)` on family_connections
  6. `(userId, isEnabled, effectiveDate)` on reminder_schedules
- Use Firebase Emulator to validate queries execute without "index required" errors

**Dependencies**: T005  
**Validation**: All tests FAIL (indexes not deployed yet)

---

### T011 [P]: Integration Test - Scenario 1: Single-Profile Setup & Daily Adherence
**Description**: E2E test for quickstart.md Scenario 1  
**File**: `tests/integration/scenario-1-single-profile.test.ts`  
**Actions**:
- Use React Native Testing Library
- Test flow:
  1. User registers with email/password (Firebase Auth)
  2. User creates profile "John Nguyen" (Patient resource)
  3. User adds medication "Aspirin 100mg" daily at 8:00 AM
  4. System creates ReminderSchedule with 30-day instances
  5. User logs medication taken (status: completed)
  6. User views adherence history (calendar shows green dot)
- Performance assertions:
  - Profile creation < 300ms
  - Medication add < 300ms
  - Log confirmation < 300ms
  - History query (100 logs) < 500ms

**Dependencies**: T005  
**Validation**: Test FAILS (no screens or services implemented)

---

### T012 [P]: Integration Test - Scenario 2: Multi-Profile Management
**Description**: E2E test for quickstart.md Scenario 2  
**File**: `tests/integration/scenario-2-multi-profile.test.ts`  
**Actions**:
- Test flow:
  1. User creates 2 child profiles (Emily, Ryan)
  2. User switches to Emily's profile
  3. User adds medication "Adderall 10mg" (weekdays only)
  4. User switches to Ryan's profile
  5. User adds medication "Ritalin 5mg" (twice daily)
  6. Verify profile-scoped queries (no data leakage)
  7. Verify notifications tagged with correct profile

**Dependencies**: T005  
**Validation**: Test FAILS (profile switching not implemented)

---

### T013 [P]: Integration Test - Scenario 3: PRN (As-Needed) Medication
**Description**: E2E test for quickstart.md Scenario 3  
**File**: `tests/integration/scenario-3-prn-medication.test.ts`  
**Actions**:
- Test flow:
  1. User adds PRN medication "Ibuprofen 400mg" (max 3 per day)
  2. User logs dose #1 at 2:30 PM
  3. User logs dose #2 at 4:00 PM
  4. User logs dose #3 at 6:00 PM
  5. User attempts dose #4 → warning shown
  6. Verify no scheduled reminders created for PRN
  7. Verify PRN history shows usage count, not adherence %

**Dependencies**: T005  
**Validation**: Test FAILS (PRN logic not implemented)

---

### T014 [P]: Integration Test - Scenario 4: Caregiver Monitoring & Remote Logging
**Description**: E2E test for quickstart.md Scenario 4  
**File**: `tests/integration/scenario-4-caregiver.test.ts`  
**Actions**:
- Test flow:
  1. Patient sends caregiver invitation (permission: can_log)
  2. Caregiver accepts invitation
  3. Caregiver views patient's medication list
  4. Caregiver logs dose on patient's behalf
  5. Verify logged_by metadata records caregiver userId
  6. Patient misses dose → caregiver receives FCM notification
  7. Patient revokes can_log permission → caregiver cannot log

**Dependencies**: T005  
**Validation**: Test FAILS (caregiver features not implemented)

---

### T015 [P]: Integration Test - Scenario 5: Offline-First & Conflict Resolution
**Description**: E2E test for quickstart.md Scenario 5  
**File**: `tests/integration/scenario-5-offline.test.ts`  
**Actions**:
- Test flow:
  1. User goes offline (disable network)
  2. User logs medication (writes to IndexedDB cache)
  3. User logs second medication (still offline)
  4. User goes online → Firestore syncs pending writes
  5. Verify server timestamps applied
  6. Simulate conflict: Patient logs offline + caregiver logs online
  7. Verify LWW resolution (last write wins based on meta.lastUpdated)
  8. Verify no data loss

**Dependencies**: T005  
**Validation**: Test FAILS (offline sync not implemented)

---

## Phase 3.3: Core Implementation (ONLY after tests T006-T015 are failing)

### T016 [P]: FHIR TypeScript Interfaces
**Description**: Define all FHIR R4 resource types from data-model.md  
**File**: `src/types/fhir.ts`  
**Actions**:
- Create TypeScript interfaces for:
  1. `FHIRPatient` (from data-model.md § 2)
  2. `FHIRMedicationRequest` (from data-model.md § 3)
  3. `FHIRMedicationAdministration` (from data-model.md § 4)
  4. `FHIRRelatedPerson` (from data-model.md § 5)
  5. `FHIRCareTeam` (from data-model.md § 5)
  6. `ReminderSchedule` (from data-model.md § 6)
- Include FHIR extension types
- Include simplified Firestore document types
- Export all types

**Dependencies**: T003 (TypeScript strict mode)  
**Validation**: `npm run lint` passes, no type errors

---

### T017 [P]: Firestore Converters for FHIR Resources
**Description**: Create Firestore data converters (TypeScript ↔ Firestore)  
**File**: `src/services/firestore/converters.ts`  
**Actions**:
- Create converters for each FHIR resource:
  ```typescript
  const patientConverter = {
    toFirestore: (patient: FHIRPatient) => ({
      // Simplified fields for queries
      userId: patient.userId,
      active: patient.active,
      name: patient.name[0].text,
      // Full FHIR resource for export
      fhirResource: patient,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    fromFirestore: (snapshot: DocumentSnapshot): FHIRPatient => {
      const data = snapshot.data();
      return data.fhirResource || data; // Fallback for legacy data
    },
  };
  ```
- Converters for: Patient, MedicationRequest, MedicationAdministration, RelatedPerson, CareTeam, ReminderSchedule
- Handle serverTimestamp() for createdAt/updatedAt

**Dependencies**: T016  
**Validation**: Unit test converter round-trips (data → Firestore → data)

---

### T018 [P]: Firebase Auth Service
**Description**: Implement authentication service with email/password  
**File**: `src/services/auth/authService.ts`  
**Actions**:
- Implement functions:
  - `signUp(email, password, displayName)` → creates Firebase Auth user
  - `signIn(email, password)` → returns User
  - `signOut()` → clears auth state
  - `getCurrentUser()` → returns current User or null
  - `onAuthStateChanged(callback)` → auth state listener
- Error handling: network errors, weak password, email exists
- Store auth state in React Context

**Dependencies**: T004, T016  
**Validation**: T011 auth test passes

---

### T019 [P]: Patient Service (FHIR Patient CRUD)
**Description**: Implement Patient resource create/read/update/delete  
**File**: `src/services/firestore/patientService.ts`  
**Actions**:
- Implement functions:
  - `createPatient(userId, name, birthDate, photo?)` → creates Patient document
  - `getPatient(patientId)` → returns FHIRPatient
  - `getUserPatients(userId)` → returns Patient[] for user
  - `updatePatient(patientId, updates)` → updates Patient
  - `deletePatient(patientId)` → soft delete (active: false)
- Use patientConverter from T017
- Apply denormalization: store userId at top level
- Validate FHIR resourceType = "Patient"

**Dependencies**: T017, T018  
**Validation**: T006 contract tests pass, T011 integration test progresses

---

### T020 [P]: MedicationRequest Service (FHIR MedicationRequest CRUD)
**Description**: Implement MedicationRequest resource create/read/update/delete  
**File**: `src/services/firestore/medicationRequestService.ts`  
**Actions**:
- Implement functions:
  - `createMedicationRequest(patientId, medicationData)` → creates MedicationRequest
  - `getMedicationRequest(id)` → returns FHIRMedicationRequest
  - `getPatientMedicationRequests(patientId, status?)` → returns MedicationRequest[]
  - `updateMedicationRequest(id, updates)` → updates MedicationRequest
  - `deleteMedicationRequest(id)` → sets status: "cancelled"
- Parse dosageInstruction.timing.repeat for schedule
- Handle PRN medications (asNeeded: true, no schedule)
- Auto-create ReminderSchedule for non-PRN medications (call T022)

**Dependencies**: T017, T019  
**Validation**: T007 contract tests pass, T011/T012 integration tests progress

---

### T021 [P]: MedicationAdministration Service (FHIR MedicationAdministration CRUD)
**Description**: Implement MedicationAdministration resource create/read/update  
**File**: `src/services/firestore/medicationAdministrationService.ts`  
**Actions**:
- Implement functions:
  - `logMedication(medicationRequestId, status, effectiveDateTime, performerUserId, performerRole)` → creates MedicationAdministration
  - `getMedicationAdministration(id)` → returns FHIRMedicationAdministration
  - `getMedicationLogs(medicationRequestId, dateRange?)` → returns MedicationAdministration[]
  - `updateMedicationAdministration(id, updates)` → updates within 24h window
  - `getMissedDoses(patientId, dateRange)` → calculates missed from ReminderSchedule
- Validate effectiveDateTime <= now()
- Validate status in FHIR value set (completed, not-done, on-hold, etc.)
- Track edit history via extensions

**Dependencies**: T017, T020  
**Validation**: T008 contract tests pass, T011/T013/T014 integration tests progress

---

### T022 [P]: ReminderSchedule Service
**Description**: Compute and store reminder notification instances  
**File**: `src/services/firestore/reminderScheduleService.ts`  
**Actions**:
- Implement functions:
  - `createReminderSchedule(medicationRequestId, timing)` → computes 30-day instances
  - `getReminderSchedule(medicationRequestId)` → returns ReminderSchedule
  - `updateReminderSchedule(id, newTiming)` → recomputes instances
  - `getUpcomingReminders(userId, dateRange)` → returns instances for notification scheduling
  - `markNotificationSent(instanceId, expoNotificationId)` → updates sent status
  - `refreshReminderSchedule(id)` → recomputes when <7 days of instances remain
- Parse FHIR timing.repeat (frequency, period, periodUnit, timeOfDay, dayOfWeek)
- Handle timezone correctly
- Pre-compute 30 days to minimize runtime computation

**Dependencies**: T017, T020  
**Validation**: Unit test: given timing, verify correct instances generated

---

### T023 [P]: FamilyConnection Service (RelatedPerson + CareTeam)
**Description**: Implement caregiver invitation and permission management  
**File**: `src/services/firestore/familyConnectionService.ts`  
**Actions**:
- Implement functions:
  - `createInvitation(patientUserId, patientId, caregiverEmail, permissionLevel)` → creates pending connection
  - `acceptInvitation(connectionId, caregiverUserId)` → status: accepted, creates RelatedPerson
  - `rejectInvitation(connectionId)` → status: rejected
  - `revokeConnection(connectionId)` → status: revoked
  - `getPatientConnections(patientUserId)` → returns FamilyConnection[]
  - `getCaregiverConnections(caregiverUserId)` → returns FamilyConnection[]
  - `updatePermissions(connectionId, newPermissionLevel)` → updates permission
  - `canCaregiverLog(caregiverUserId, patientId)` → checks permission_level = can_log
- Send email notification for invitation (Firebase Cloud Function or expo-mail-composer)

**Dependencies**: T017, T019  
**Validation**: T009 contract tests pass, T014 integration test progresses

---

### T024: Expo Notifications Service
**Description**: Implement local notification scheduling and handling  
**File**: `src/services/notifications/notificationService.ts`  
**Actions**:
- Implement functions:
  - `requestPermissions()` → requests notification permissions (iOS/Android)
  - `scheduleNotification(instanceId, scheduledTime, medicationName, dosage)` → schedules Expo notification
  - `cancelNotification(instanceId)` → cancels scheduled notification
  - `rescheduleAllNotifications(userId)` → re-schedules upcoming reminders (call T022)
  - `handleNotificationResponse(response)` → user tapped notification
- Configure notification channels (Android)
- Handle notification actions ("I Took It" button → log medication)
- Background notification handler (app closed)

**Dependencies**: T022, T021  
**Validation**: T011 integration test notification delivery passes

---

### T025: Deploy Firestore Security Rules
**Description**: Deploy firestore-security-rules.md to Firebase project  
**File**: `firestore.rules` (repository root)  
**Actions**:
- Convert `contracts/firestore-security-rules.md` markdown to `firestore.rules` syntax
- Include all helper functions (isOwner, isCaregiver, caregiverCanLog, withinEditWindow)
- Include all resource rules (patients, medication_requests, medication_administrations, family_connections, reminder_schedules)
- Deploy to Firebase:
  ```bash
  firebase deploy --only firestore:rules
  ```
- Test with Firebase Emulator locally before production deploy

**Dependencies**: T006, T007, T008, T009  
**Validation**: T006-T009 contract tests now PASS

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

**Sequential Flow**:
1. **Setup (T001-T005)** → Must complete before any other work
2. **Tests (T006-T015)** → Must complete and FAIL before T016-T034
3. **Core Services (T016-T023)** → Can be parallelized within phase
4. **Notifications & Deployment (T024-T026)** → After core services
5. **UI Screens (T027-T033)** → After services available
6. **Cloud Functions (T034)** → After Firestore schema deployed
7. **Validation (T035)** → After all implementation

**Critical Path**:
```
T001 → T002 → T003 → T005 → T006-T015 (tests) →
T016 → T017 → T018 → T019 → T020 → T021 →
T025 (security rules) → T027 (UI) → T030 (logging) → T035 (validation)
```

**Parallel Opportunities**:
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

### Before Starting Implementation (Phase 3.3)
- [x] All T006-T015 tests written and FAILING
- [x] Test coverage includes all 5 quickstart scenarios
- [x] Contract tests cover all security rules
- [x] Performance assertions included in tests

### After Implementation Complete
- [ ] All T006-T015 tests now PASSING
- [ ] Contract tests verify security rules enforce permissions
- [ ] Integration tests validate E2E user flows
- [ ] Performance tests meet targets (300ms UI, 500ms queries)
- [ ] Offline tests validate sync and conflict resolution
- [ ] Code passes ESLint with zero warnings
- [ ] TypeScript compiles with zero errors (strict mode)
- [ ] Firebase security rules deployed and tested
- [ ] Firebase indexes deployed and verified
- [ ] Cloud function deployed and tested

### Ready for Beta Launch
- [ ] All 35 tasks complete
- [ ] Constitution principles satisfied (TDD, code quality, UX, performance, docs)
- [ ] Detox E2E tests pass on iOS + Android
- [ ] Manual testing of quickstart.md scenarios complete
- [ ] Firebase quotas reviewed (within free tier or budget allocated)
- [ ] Expo build configured for TestFlight / Internal Testing
- [ ] Privacy policy + terms of service reviewed
- [ ] Crash reporting configured (Sentry or Firebase Crashlytics)

---

**Estimated Timeline**: 
- Solo developer: ~25-30 hours total (3-4 weeks part-time)
- With parallelization: ~15-18 hours (1.5-2 weeks part-time)
- Full-time: ~1 week

**Next Command**: Execute tasks sequentially or in parallel following dependencies above.
