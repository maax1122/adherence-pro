# Quickstart Integration Test Scenarios

**Date**: 2025-10-09  
**Feature**: Medication Family Tracker MVP (Web-First)  
**Purpose**: Validate end-to-end user flows through integration tests  
**Platform**: Web (Browser-based tests)

---

## Overview

This document defines 5 core integration test scenarios that validate the Medication Family Tracker application from a user's perspective. Each scenario represents a complete user journey and should be implemented as an integration test.

**Test Framework**: Vitest + React Testing Library + Firebase Emulator  
**Test Location**: `tests/integration/`  
**Execution**: Run with Firebase Emulator (`firebase emulators:start`)

---

## Scenario 1: Single Profile Setup (New User Onboarding)

**User Story**: As a new user, I want to register, create my patient profile, add my first medication with a schedule, and receive reminders so I can track my medication adherence.

### Test Steps

1. **Registration**
   - Navigate to `/register` page
   - Enter email: `john@example.com`, password: `SecurePass123!`
   - Click "Register" button
   - Assert: Redirected to `/dashboard`
   - Assert: Firebase Auth user created

2. **Create Patient Profile**
   - Click "Add Profile" button on dashboard
   - Fill form:
     - Name: "John Doe"
     - Date of Birth: "1990-01-01"
     - Role: "Self"
     - Upload photo (mock file input)
   - Click "Save Profile" button
   - Assert: Patient document created in Firestore `/patients/{id}`
   - Assert: Profile card appears on dashboard with name "John Doe"

3. **Add Scheduled Medication**
   - Click "Add Medication" button
   - Fill form:
     - Medication Name: "Aspirin"
     - Dosage: "100mg"
     - Form: "Tablet"
     - Route: "Oral"
     - Frequency: "Twice daily"
     - Intake Times: ["08:00", "20:00"]
     - Start Date: "2025-10-09"
     - Instructions: "Take with food"
   - Upload medication photo (mock file)
   - Click "Save Medication" button
   - Assert: MedicationRequest document created in Firestore
   - Assert: Medication card appears with "Aspirin 100mg, Twice daily"

4. **Verify Reminder Schedule**
   - Assert: ReminderSchedule document created in Firestore
   - Assert: Next reminder time displayed: "Next dose at 8:00 AM"
   - Mock: Advance system time to 08:00
   - Assert: Browser notification permission requested (mock granted)
   - Assert: Browser notification displayed: "Time to take Aspirin 100mg"

5. **Log Medication Intake**
   - Click "Mark as Taken" button on notification
   - Assert: MedicationAdministration document created
   - Assert: Status: "completed", administrationStatus: "taken"
   - Assert: Medication card updates: "Last taken: Today at 8:00 AM"
   - Assert: Adherence calendar shows green checkmark for today

### Expected Data State (Firestore)

```json
{
  "patients/patient123": {
    "resourceType": "Patient",
    "userId": "user123",
    "active": true,
    "name": "John Doe",
    "birthDate": "1990-01-01",
    "role": "self"
  },
  "medication_requests/med123": {
    "resourceType": "MedicationRequest",
    "userId": "user123",
    "patientId": "patient123",
    "status": "active",
    "medicationName": "Aspirin",
    "dosageAmount": "100mg",
    "frequency": 2,
    "intakeTimes": ["08:00", "20:00"]
  },
  "medication_administrations/admin123": {
    "resourceType": "MedicationAdministration",
    "userId": "user123",
    "patientId": "patient123",
    "medicationRequestId": "med123",
    "status": "completed",
    "administrationStatus": "taken",
    "actualTime": "2025-10-09T08:00:00Z"
  }
}
```

### Assertions

- ✅ User registered and authenticated
- ✅ Patient profile created and visible
- ✅ Medication request created with correct schedule
- ✅ Reminder schedule computed correctly
- ✅ Browser notification displayed at scheduled time
- ✅ Medication log created when marked as taken
- ✅ UI updates reflect current state

---

## Scenario 2: Multi-Profile Family Management (Parent with Children)

**User Story**: As a parent, I want to create profiles for my 2 children, add different medications for each child, switch between profiles, and view a unified adherence dashboard so I can manage my family's medications.

### Test Steps

1. **Create First Child Profile**
   - Login as existing user (from Scenario 1)
   - Navigate to `/dashboard`
   - Click "Add Profile" button
   - Fill form:
     - Name: "Emma Doe"
     - Date of Birth: "2015-03-15"
     - Role: "Family Member"
   - Click "Save Profile"
   - Assert: Patient document created for Emma

2. **Add Medication for First Child**
   - Select "Emma Doe" from profile dropdown
   - Click "Add Medication"
   - Fill form:
     - Medication: "Amoxicillin"
     - Dosage: "250mg"
     - Frequency: "3 times daily"
     - Intake Times: ["08:00", "14:00", "20:00"]
     - Duration: "7 days"
     - Start Date: "2025-10-09"
   - Click "Save"
   - Assert: Medication created for Emma's profile

3. **Create Second Child Profile**
   - Click "Add Profile" button
   - Fill form:
     - Name: "Oliver Doe"
     - Date of Birth: "2018-07-22"
     - Role: "Family Member"
   - Click "Save Profile"
   - Assert: Patient document created for Oliver

4. **Add Medication for Second Child**
   - Select "Oliver Doe" from profile dropdown
   - Click "Add Medication"
   - Fill form:
     - Medication: "Vitamin D"
     - Dosage: "400 IU"
     - Frequency: "Once daily"
     - Intake Times: ["09:00"]
     - Duration: "Indefinite"
   - Click "Save"
   - Assert: Medication created for Oliver's profile

5. **Switch Between Profiles**
   - Select "Emma Doe" from dropdown
   - Assert: Only Emma's medications displayed (Amoxicillin)
   - Select "Oliver Doe" from dropdown
   - Assert: Only Oliver's medications displayed (Vitamin D)
   - Select "All Profiles" from dropdown
   - Assert: All medications displayed (Aspirin, Amoxicillin, Vitamin D)

6. **Verify Unified Dashboard**
   - Navigate to `/dashboard`
   - Assert: 3 profiles visible (John, Emma, Oliver)
   - Assert: Adherence summary shows all profiles:
     - "3 medications scheduled today"
     - "Upcoming: Emma - Amoxicillin at 2:00 PM"
   - Assert: Calendar view shows color-coded entries per profile

7. **Receive Notifications for Multiple Children**
   - Mock: Advance time to 08:00
   - Assert: 2 notifications displayed:
     - "John: Time to take Aspirin 100mg"
     - "Emma: Time to take Amoxicillin 250mg"
   - Click "Mark as Taken" on Emma's notification
   - Assert: Only Emma's medication logged, John's remains pending

### Expected Data State

```json
{
  "patients": {
    "patient123": { "name": "John Doe", "role": "self" },
    "patient456": { "name": "Emma Doe", "role": "family_member" },
    "patient789": { "name": "Oliver Doe", "role": "family_member" }
  },
  "medication_requests": {
    "med123": { "patientId": "patient123", "medicationName": "Aspirin" },
    "med456": { "patientId": "patient456", "medicationName": "Amoxicillin" },
    "med789": { "patientId": "patient789", "medicationName": "Vitamin D" }
  }
}
```

### Assertions

- ✅ Multiple patient profiles created under one user
- ✅ Each profile has independent medication list
- ✅ Profile switching works correctly
- ✅ Unified dashboard shows aggregated data
- ✅ Notifications separated by profile
- ✅ Logging medication updates only relevant profile

---

## Scenario 3: PRN Medication (As-Needed Medication)

**User Story**: As a caregiver, I want to add a PRN (as-needed) medication with detailed instructions, photos, and usage limits so my patient knows when and how to take it.

### Test Steps

1. **Add PRN Medication**
   - Login and select patient profile
   - Click "Add Medication"
   - Toggle "PRN (As Needed)" switch
   - Fill form:
     - Medication: "Tylenol"
     - Dosage: "500mg"
     - Form: "Tablet"
     - PRN Condition: "When headache occurs"
     - How Much: "1-2 tablets"
     - Max Dose Per Day: "6 tablets"
     - Visual Description: "White round pill with 'TYLENOL 500' imprint"
   - Upload medication photo
   - Click "Save"
   - Assert: MedicationRequest created with `isPRN: true`
   - Assert: No reminder schedule created

2. **View PRN Medication List**
   - Navigate to "PRN Medications" tab
   - Assert: Tylenol displayed with:
     - Condition: "When headache occurs"
     - Instructions: "1-2 tablets"
     - Max: "6 tablets per day"
     - Photo visible
   - Assert: No scheduled time shown

3. **Log PRN Intake (First Time)**
   - Click "Log Intake" button on Tylenol card
   - Select dose: "1 tablet"
   - Add note: "Mild headache after lunch"
   - Click "Save Log"
   - Assert: MedicationAdministration created:
     - `status: "completed"`
     - `actualTime: <current timestamp>`
     - `doseText: "1 tablet"`
     - `notes: "Mild headache after lunch"`
   - Assert: Tylenol card updates: "Last taken: Today at 1:30 PM (1 tablet)"

4. **Track Daily Usage**
   - Log intake again 2 hours later: "2 tablets"
   - Assert: Usage counter updates: "Taken 2 times today (3 tablets total)"
   - Assert: Warning displayed: "3 of 6 tablets used today"

5. **Enforce Max Dose Limit**
   - Attempt to log 4 more tablets (would exceed 6)
   - Assert: Warning modal: "This would exceed the daily maximum of 6 tablets"
   - Assert: "Log Anyway" button (allows override with confirmation)
   - Assert: "Cancel" button (prevents logging)
   - Click "Cancel"
   - Assert: Intake not logged

### Expected Data State

```json
{
  "medication_requests/med_prn_123": {
    "resourceType": "MedicationRequest",
    "userId": "user123",
    "patientId": "patient123",
    "status": "active",
    "medicationName": "Tylenol",
    "dosageAmount": "500mg",
    "isPRN": true,
    "prnCondition": "When headache occurs",
    "maxDosePerDay": "6 tablets",
    "visualDescription": "White round pill with 'TYLENOL 500' imprint",
    "photoUrl": "https://storage.googleapis.com/..."
  },
  "medication_administrations": [
    {
      "medicationRequestId": "med_prn_123",
      "actualTime": "2025-10-09T13:30:00Z",
      "doseText": "1 tablet",
      "notes": "Mild headache after lunch"
    },
    {
      "medicationRequestId": "med_prn_123",
      "actualTime": "2025-10-09T15:30:00Z",
      "doseText": "2 tablets",
      "notes": ""
    }
  ]
}
```

### Assertions

- ✅ PRN medication created without schedule
- ✅ Detailed instructions and photos stored
- ✅ Manual logging works correctly
- ✅ Daily usage tracked accurately
- ✅ Max dose warning displayed
- ✅ Override mechanism available with confirmation
- ✅ Can log PRN dose in < 10 seconds from app open

---



---

## Scenario 4: Caregiver Monitoring (Invitation & Remote Access)

**User Story**: As a patient, I want to invite a caregiver to monitor my medications, and as a caregiver, I want to view patient medications, receive alerts when they miss a dose, and log medications on their behalf.

### Test Steps

1. **Send Caregiver Invitation (Patient Side)**
   - Login as patient (John Doe)
   - Navigate to `/family` page
   - Click "Invite Caregiver" button
   - Enter caregiver email: `caregiver@example.com`
   - Select patient profile: "John Doe"
   - Set permissions: "Can view and log medications"
   - Click "Send Invitation"
   - Assert: FamilyConnection document created:
     - `status: "pending"`
     - Email sent to caregiver (mock email service)
   - Assert: Invitation appears in "Pending Invitations" section

2. **Accept Invitation (Caregiver Side)**
   - Logout patient
   - Register new user (caregiver): `caregiver@example.com`
   - Click invitation link in email (mock)
   - Assert: Redirected to `/family/invitation/{connectionId}`
   - Assert: Invitation details displayed:
     - "John Doe invites you to be their caregiver"
     - "You will be able to: View medications, Log medications"
   - Click "Accept Invitation" button
   - Assert: FamilyConnection updated: `status: "accepted"`
   - Assert: Redirected to caregiver dashboard

3. **View Patient Medications (Caregiver Dashboard)**
   - Assert: Caregiver dashboard shows:
     - Section: "Patients You Care For"
     - Card: "John Doe" with status "Active"
   - Click on "John Doe" card
   - Assert: Redirected to `/patients/patient123`
   - Assert: Patient's medications displayed (Aspirin 100mg)
   - Assert: "Add Medication" button disabled (read-only except logging)

4. **Receive Missed Dose Alert (Caregiver)**
   - Mock: Patient misses 8:00 AM Aspirin dose
   - Mock: 15 minutes pass (grace period)
   - Mock: Cloud Function triggers (checkMissedDoses)
   - Assert: FCM notification sent to caregiver device token
   - Assert: Browser notification displayed:
     - "John Doe missed their 8:00 AM Aspirin dose"
     - Action buttons: "View", "Dismiss"
   - Click "View" button
   - Assert: Redirected to patient medication page

5. **Log Medication on Behalf of Patient**
   - On patient medication page (as caregiver)
   - Click "Log on Behalf" button for missed Aspirin
   - Select status: "Taken (Late)"
   - Add note: "Patient forgot, took at 8:30 AM"
   - Click "Save Log"
   - Assert: MedicationAdministration created:
     - `performedBy: <caregiver userId>`
     - `performedByRole: "caregiver"`
     - `administrationStatus: "taken_late"`
     - `notes: "Patient forgot, took at 8:30 AM"`
   - Assert: Medication card updates: "Taken by Caregiver Jane at 8:30 AM"
   - Assert: Patient sees updated log on their dashboard

6. **Patient Revokes Caregiver Access**
   - Login as patient (John Doe)
   - Navigate to `/family` page
   - Click "Manage Caregivers" tab
   - Assert: Caregiver "Jane Smith" listed with status "Active"
   - Click "Revoke Access" button
   - Confirm dialog: "Are you sure?"
   - Click "Yes, Revoke"
   - Assert: FamilyConnection updated: `status: "revoked"`
   - Logout patient, login as caregiver
   - Assert: "John Doe" no longer appears in caregiver dashboard
   - Attempt to access `/patients/patient123`
   - Assert: Access denied (Firestore Security Rules block)

### Expected Data State

```json
{
  "family_connections/user123_caregiver456": {
    "patientUserId": "user123",
    "caregiverUserId": "caregiver456",
    "patientId": "patient123",
    "status": "accepted", // then "revoked"
    "permissions": ["can_view", "can_log"],
    "invitedAt": "2025-10-09T10:00:00Z",
    "acceptedAt": "2025-10-09T10:15:00Z",
    "revokedAt": "2025-10-09T12:00:00Z"
  },
  "medication_administrations/admin_caregiver_123": {
    "resourceType": "MedicationAdministration",
    "userId": "user123", // Patient's userId
    "patientId": "patient123",
    "medicationRequestId": "med123",
    "performedBy": "caregiver456",
    "performedByRole": "caregiver",
    "performedByName": "Jane Smith",
    "administrationStatus": "taken_late",
    "actualTime": "2025-10-09T08:30:00Z",
    "scheduledTime": "2025-10-09T08:00:00Z",
    "notes": "Patient forgot, took at 8:30 AM"
  }
}
```

### Assertions

- ✅ Caregiver invitation sent and email triggered
- ✅ Caregiver can accept/reject invitation
- ✅ Accepted caregiver can view patient medications
- ✅ Caregiver receives browser notification for missed doses
- ✅ Caregiver can log medications on behalf of patient
- ✅ Log correctly attributes action to caregiver
- ✅ Patient can revoke caregiver access
- ✅ Revoked caregiver loses access immediately

---

## Scenario 5: Offline Usage & Sync (Progressive Web App)

**User Story**: As a user with unreliable internet, I want to view my medications, log intake while offline, and have my data automatically sync when I reconnect so I never lose my adherence data.

### Test Steps

1. **Setup: User with Existing Data**
   - Login as existing user (from Scenario 1)
   - Assert: 1 patient profile, 1 active medication (Aspirin)
   - Assert: Firestore offline persistence enabled
   - Assert: Service Worker registered

2. **Go Offline**
   - Open browser DevTools → Network tab
   - Select "Offline" throttling
   - Assert: App displays offline indicator banner: "You are offline. Changes will sync when reconnected."
   - Refresh page (F5)
   - Assert: App loads from Service Worker cache
   - Assert: UI fully functional (no loading spinners stuck)

3. **View Medications Offline**
   - Navigate to `/medications` page
   - Assert: Medications list displays from IndexedDB cache
   - Assert: Aspirin 100mg visible with all details
   - Assert: Medication photos loaded from Service Worker cache
   - Click on medication card
   - Assert: Details page loads from cache

4. **Log Medication Intake Offline**
   - Click "Mark as Taken" button on Aspirin
   - Assert: Optimistic UI update (green checkmark appears immediately)
   - Assert: MedicationAdministration queued in IndexedDB
   - Assert: Sync indicator: "1 change pending sync"
   - Navigate to adherence history
   - Assert: New log entry visible (from local state)

5. **Attempt to Add Medication Offline**
   - Click "Add Medication" button
   - Fill form with new medication
   - Click "Save"
   - Assert: Warning modal: "You are offline. This medication will be saved when you reconnect."
   - Click "Save Anyway"
   - Assert: Medication queued in IndexedDB
   - Assert: Sync indicator: "2 changes pending sync"

6. **Go Back Online**
   - DevTools → Network tab → Select "No throttling"
   - Assert: Service Worker detects online event
   - Assert: Background sync triggered automatically
   - Assert: Sync indicator updates: "Syncing 2 changes..."
   - Wait 2 seconds
   - Assert: Sync completes: "All changes synced ✓"
   - Assert: Queued writes sent to Firestore
   - Assert: Server timestamps applied

7. **Verify Sync Integrity**
   - Refresh page (F5)
   - Assert: All data persists (medications, logs)
   - Assert: Server timestamps replace local timestamps
   - Login on different device (mock)
   - Assert: Changes visible on second device (real-time sync)

8. **Handle Sync Conflicts**
   - Setup: Log same medication on 2 devices while both offline
   - Device A: Logs Aspirin at 08:00 (offline)
   - Device B: Logs Aspirin at 08:01 (offline)
   - Both devices go online
   - Assert: Last-Write-Wins (Device B's log wins)
   - Assert: Device A's log discarded (or merged with conflict flag)
   - Assert: Conflict notification: "Your log was overwritten by a newer entry"

### Expected Data State

**Offline (IndexedDB)**:
```json
{
  "_pending_writes": [
    {
      "collection": "medication_administrations",
      "operation": "create",
      "data": {
        "medicationRequestId": "med123",
        "actualTime": "2025-10-09T08:00:00.000Z", // Local timestamp
        "status": "completed",
        "administrationStatus": "taken"
      },
      "timestamp": 1696838400000
    }
  ],
  "_cached_data": {
    "medication_requests/med123": { /* cached medication */ }
  }
}
```

**Online (Firestore after sync)**:
```json
{
  "medication_administrations/admin_offline_123": {
    "resourceType": "MedicationAdministration",
    "userId": "user123",
    "patientId": "patient123",
    "medicationRequestId": "med123",
    "status": "completed",
    "administrationStatus": "taken",
    "actualTime": "2025-10-09T08:00:00Z",
    "meta": {
      "createdAt": "<server timestamp>", // Replaced with server time
      "lastUpdated": "<server timestamp>"
    }
  }
}
```

### Assertions

- ✅ App loads fully offline from Service Worker cache
- ✅ Medications and photos cached in IndexedDB
- ✅ Logging medications works offline (optimistic UI)
- ✅ Offline writes queued in IndexedDB
- ✅ Sync indicator shows pending changes
- ✅ Background sync triggers automatically when online
- ✅ All queued writes sent to Firestore
- ✅ Server timestamps applied on sync
- ✅ Conflict resolution (Last-Write-Wins) works
- ✅ No data loss during offline/online transitions

---

## Test Execution

### Running Integration Tests

```bash
# Start Firebase Emulator
firebase emulators:start --only firestore,auth

# Run integration tests
npm run test:integration

# Run specific scenario
npm run test:integration -- scenario-1-single-profile

# Run with coverage
npm run test:integration -- --coverage
```

### Test Configuration (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
});
```

### Mock Services

```typescript
// tests/mocks/firebaseEmulator.ts
export const connectToEmulator = () => {
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
};

// tests/mocks/notificationService.ts
export const mockNotificationPermission = () => {
  Object.defineProperty(window.Notification, 'permission', {
    writable: true,
    value: 'granted',
  });
};
```

---

## Success Criteria

All 5 scenarios must pass with:
- ✅ **100% Firestore operations succeed** (create, read, update, delete)
- ✅ **All UI interactions work** (form submissions, navigation, button clicks)
- ✅ **Security rules enforced** (unauthorized access denied)
- ✅ **Real-time sync validated** (changes appear across sessions)
- ✅ **Offline functionality confirmed** (Service Worker, IndexedDB)
- ✅ **No console errors** (React warnings, Firestore errors)

---

## Status

✅ **Quickstart complete** (5 scenarios defined)  
✅ **Integration test specifications ready**  
⏳ **Next**: Implement tests in `tests/integration/*.test.ts`  
⏳ **Next**: Setup Firebase Emulator Suite  
⏳ **Next**: Configure Vitest for integration testing  

**Version**: 1.0 (Web-First)  
**Last Updated**: 2025-10-09  
**Platform**: Web (Browser-based tests with Firebase Emulator)
