# Quickstart Guide: User Story Validation

## Overview
This document maps the 5 acceptance scenarios from the specification to concrete user flows for validation testing. Each scenario represents a critical user journey that must work end-to-end for MVP success.

---

## Scenario 1: Single-Profile Setup & Daily Adherence

**User Story**: *"As a retired teacher taking heart medication, I want to track my daily pills so I never miss a dose."*

### Setup Phase
1. **User Registration**
   - Open app → "Get Started"
   - Sign up with email/password (Firebase Auth)
   - Set language preference: English or Tiếng Việt
   - Verify email (optional for MVP, skip for demo)

2. **Profile Creation** (FHIRPatient)
   - Tap "Create Profile" → "For Myself"
   - Enter name: "John Nguyen"
   - Set birthDate: "1955-03-15"
   - Upload photo (optional)
   - Save → Creates `/patients/{patientId}` document

3. **Add First Medication** (FHIRMedicationRequest)
   - Tap "Add Medication" button
   - Enter medication name: "Aspirin"
   - Set dosageInstruction:
     - Dosage amount: "100mg"
     - Form: "Pill"
     - Route: "Oral"
     - Timing: "Daily at 8:00 AM"
     - Frequency: 1 time per day
     - Duration: Ongoing (no end date)
   - Upload medication photo (optional)
   - Save → Creates `/medication_requests/{id}` document
   - System auto-creates `/reminder_schedules/{id}` with 30-day instances

### Daily Use Phase
4. **Receive Notification**
   - System triggers Expo local notification at 8:00 AM
   - Notification shows: "Time to take Aspirin - 100mg tablet"
   - Sound + vibration enabled by default

5. **Log Medication Taken** (FHIRMedicationAdministration)
   - Open notification → App opens to medication detail
   - Tap "I Took It" button
   - System creates `/medication_administrations/{id}`:
     - status: "completed"
     - effectiveDateTime: current timestamp
     - scheduledTime: 8:00 AM today
     - performer: John's userId, role "patient"
   - UI shows green checkmark + "Taken at 8:03 AM"

6. **View Adherence History**
   - Navigate to "History" tab
   - See calendar view with:
     - Green dots: Days with 100% adherence
     - Red dots: Days with missed doses
   - Tap specific date → See all medications for that day
   - See adherence rate: "28/30 days (93%)"

### Validation Checkpoints
- ✅ User can create profile and add medication in < 2 minutes
- ✅ Notification delivers within 5 minutes of scheduled time
- ✅ Log confirmation completes in < 300ms (p95)
- ✅ History query loads < 100 medication administrations in < 500ms
- ✅ Offline: Can log medication without internet, syncs when reconnected

---

## Scenario 2: Multi-Profile Management (Parent Tracking Children)

**User Story**: *"As a mother of two children with ADHD medication, I want to manage both their schedules separately so I don't confuse their doses."*

### Setup Phase
1. **Create Child Profiles** (FHIRPatient)
   - After own profile exists, tap "Add Profile"
   - Select "For Someone Else" → "Child"
   - **Child 1**: 
     - Name: "Emily", birthDate: "2015-06-10"
     - Relationship: "Daughter"
   - **Child 2**: 
     - Name: "Ryan", birthDate: "2018-09-22"
     - Relationship: "Son"
   - Creates 2 additional `/patients/{id}` documents with parent's userId

2. **Add Medications Per Child**
   - **Emily's Medication**:
     - Switch to Emily's profile (profile picker at top)
     - Add "Adderall 10mg" - Daily at 7:00 AM (school days only)
     - dosageInstruction.timing.repeat.dayOfWeek: ["mon", "tue", "wed", "thu", "fri"]
   - **Ryan's Medication**:
     - Switch to Ryan's profile
     - Add "Ritalin 5mg" - Twice daily at 7:00 AM and 2:00 PM
     - dosageInstruction.timing.repeat.frequency: 2, period: 1, periodUnit: "d"

### Daily Use Phase
3. **Profile Switching**
   - Home screen shows profile cards:
     - "You (John)" - 1 medication due today
     - "Emily" - 1 medication due today
     - "Ryan" - 2 medications due today
   - Tap profile card → See medications for that profile only

4. **Context-Aware Notifications**
   - 7:00 AM: Two notifications fire:
     - "Time for Emily to take Adderall - 10mg tablet"
     - "Time for Ryan to take Ritalin - 5mg tablet"
   - Each notification deep-links to correct profile

5. **Log for Multiple Profiles**
   - Log Emily's dose → status: "completed"
   - 10 minutes later, log Ryan's dose → status: "completed"
   - 2:00 PM: Log Ryan's second dose
   - Each creates separate `/medication_administrations/{id}` with correct patientId

6. **Separate History Views**
   - Emily's History: Shows only her Adderall logs (weekdays only)
   - Ryan's History: Shows both AM/PM Ritalin doses
   - Combined View (parent dashboard): Aggregated adherence for both children

### Validation Checkpoints
- ✅ Can manage 3+ profiles without confusion (clear visual separation)
- ✅ Notifications correctly tagged with profile name
- ✅ Logging to wrong profile prevented (confirmation dialog)
- ✅ Profile-scoped queries perform < 300ms even with 1000+ logs
- ✅ No data leakage between profiles (security rules enforce isolation)

---

## Scenario 3: PRN (As-Needed) Medication

**User Story**: *"As someone with occasional migraines, I want to track when I take pain medication as needed, not on a fixed schedule."*

### Setup Phase
1. **Add PRN Medication** (FHIRMedicationRequest)
   - Navigate to profile → "Add Medication"
   - Enter name: "Ibuprofen"
   - Dosage: "400mg tablet"
   - **Toggle "PRN (As Needed)" = ON**
   - asNeededCodeableConcept: "For migraine headache"
   - maxDosePerPeriod: 3 doses per 24 hours
   - Instructions: "Take when headache starts, max 3 per day"
   - Save → Creates MedicationRequest with asNeeded: true
   - **No reminder schedule created** (PRN = on-demand only)

### Daily Use Phase
2. **Log PRN Dose (Proactive)**
   - User feels migraine starting at 2:30 PM
   - Open app → Navigate to "Ibuprofen" medication card
   - Tap "I Took It" button (always visible for PRN)
   - System creates `/medication_administrations/{id}`:
     - status: "completed"
     - effectiveDateTime: 2:30 PM
     - scheduledTime: null (PRN has no schedule)
     - statusReason: null (optional)
   - UI shows: "Last taken: 2:30 PM today (1 of 3 doses today)"

3. **Maximum Dose Warning**
   - User tries to log 4th dose at 8:00 PM
   - System queries: `medication_administrations` where medicationRequestId = ibuprofen AND effectiveDateTime >= today 00:00
   - Counts 3 doses already
   - Shows warning dialog: "Daily limit reached (3/3 doses). Consult doctor before taking more."
   - User can still log with "Override" confirmation

4. **PRN History View**
   - Navigate to Ibuprofen history
   - Shows doses on timeline (no missed/late indicators)
   - Displays patterns: "Taken 8 times this month" with date list
   - Export option: "Share PRN usage report with doctor (PDF)"

### Validation Checkpoints
- ✅ PRN medications have no scheduled reminders
- ✅ "I Took It" button always visible for PRN (vs scheduled medications hide after window)
- ✅ Max dose validation works offline (cached query)
- ✅ PRN history distinguishes from scheduled medications (no adherence %)
- ✅ Can log PRN dose in < 10 seconds from app open

---

## Scenario 4: Caregiver Monitoring & Remote Logging

**User Story**: *"As a daughter caring for my elderly father, I want to see if he took his medications and log doses when I visit him."*

### Setup Phase
1. **Patient Sends Invitation** (FHIRRelatedPerson)
   - Father (John) opens app → "Settings" → "Caregivers"
   - Tap "Invite Caregiver"
   - Enter daughter's email: "emily@example.com"
   - Set permissions:
     - ☑ "Can view medication history"
     - ☑ "Can log doses on my behalf"
     - ☑ "Receive miss alerts"
   - Add relationship: "Daughter"
   - Send invitation → Creates `/family_connections/{id}`:
     - status: "pending"
     - permissionLevel: "can_log"
     - canReceiveNotifications: true

2. **Caregiver Accepts Invitation**
   - Emily receives email notification
   - Opens app (creates account if new user)
   - Sees invitation: "John Nguyen wants you to monitor their medications"
   - Tap "Accept" → Updates connection status: "accepted"
   - Creates `/related_persons/{id}` and optionally `/care_teams/{id}`

### Daily Use Phase
3. **Caregiver Views Patient Status**
   - Emily opens app → Sees two profile sections:
     - "My Medications" (her own)
     - "Caring For: John Nguyen" (caregiver access)
   - Taps John's profile → Sees his medication list:
     - Aspirin 100mg - Due at 8:00 AM (green checkmark = taken at 8:03 AM)
     - Lisinopril 10mg - Due at 8:00 PM (gray = not yet due)

4. **Caregiver Logs Dose Remotely**
   - Emily visits father at 6:00 PM
   - Father forgot to log morning dose (took it but didn't confirm in app)
   - Emily opens app → John's profile → Aspirin
   - Sees "Taken at 8:00 AM?" prompt (scheduled time passed)
   - Taps "Confirm Taken" → "Who took it?"
     - Option 1: "John took it himself" (logged_by: John, role: patient)
     - Option 2: "I gave it to John" (logged_by: Emily, role: caregiver)
   - Selects Option 1 → Creates `/medication_administrations/{id}`:
     - status: "completed"
     - effectiveDateTime: 8:00 AM today
     - performerUserId: John's ID
     - performerRole: "patient"
     - loggedByUserId: Emily's ID (extension: logged-by-caregiver)

5. **Caregiver Receives Miss Alert**
   - Next day, 8:30 AM: John misses Aspirin dose
   - System triggers Cloud Function at 8:30 AM (30-min grace period)
   - Queries `/medication_administrations` for today's Aspirin dose → Not found
   - Finds active FamilyConnection where canReceiveNotifications: true
   - Sends Firebase Cloud Messaging push to Emily:
     - "John Nguyen missed Aspirin 100mg at 8:00 AM"
   - Emily opens notification → Can call John or log dose remotely

6. **Permission Management**
   - Father revokes logging permission:
     - Settings → Caregivers → Emily → Toggle off "Can log doses"
     - Updates FamilyConnection: permissionLevel = "view_only"
   - Emily can still view history but "Log Dose" buttons now disabled
   - Security rules enforce: `caregiverCanLog()` check fails

### Validation Checkpoints
- ✅ Invitation flow completes in < 1 minute
- ✅ Caregiver sees patient data within 5 seconds of acceptance
- ✅ Remote logging clearly indicates who performed action (audit trail)
- ✅ Miss alerts deliver to caregiver within 5 minutes of grace period
- ✅ Permission changes propagate to caregiver app within 30 seconds (Firebase sync)
- ✅ Security rules prevent unauthorized logging (view_only caregivers blocked)

---

## Scenario 5: Offline-First & Conflict Resolution

**User Story**: *"As a user in rural Vietnam with spotty internet, I want to log medications offline and have them sync when I get back online."*

### Setup Phase
1. **Enable Offline Persistence**
   - App initializes with Firestore offline persistence enabled:
     ```typescript
     await enableIndexedDbPersistence(firestore);
     ```
   - Caches last 7 days of medication data locally

### Offline Use Phase
2. **Go Offline**
   - User's phone loses internet at 7:30 AM (rural area)
   - App shows offline indicator (yellow banner: "Offline - Changes will sync later")

3. **Log Dose Offline**
   - 8:00 AM: Expo local notification fires (no internet needed)
   - User taps "I Took It"
   - App creates `/medication_administrations/{id}` **locally**:
     - Firestore writes to IndexedDB cache
     - UI shows immediate feedback (green checkmark)
     - Sync status icon: "Pending upload"

4. **Multiple Offline Logs**
   - 8:00 PM: User logs second medication (still offline)
   - Both logs queued in Firestore offline cache
   - UI shows all updates instantly (optimistic updates)

### Sync & Conflict Resolution Phase
5. **Reconnect Online**
   - 9:00 PM: Internet restored
   - App detects connectivity → Syncs pending writes
   - Firestore uploads 2 medication administration documents
   - Server timestamp fields updated: `meta.lastUpdated`
   - Sync status changes to "Synced" (green checkmark)

6. **Conflict Scenario: Last-Write-Wins**
   - **Edge Case**: User logged on phone (offline) + caregiver logged remotely (online)
   - Timeline:
     - 8:00 AM: John logs on phone (offline) → effectiveDateTime: 8:00 AM
     - 8:15 AM: Emily (caregiver) remotely logs for John (online) → effectiveDateTime: 8:10 AM
     - 9:00 PM: John's phone syncs
   - **Conflict Detection**:
     - Firestore receives John's write with older `meta.lastUpdated`
     - LWW (Last-Write-Wins) strategy:
       - Both writes succeed (creates 2 separate administrations)
       - App logic deduplicates on read: Keeps Emily's log (newer)
       - Query: `ORDER BY meta.lastUpdated DESC LIMIT 1`
   - **User Notification**:
     - John sees: "Aspirin already logged by Emily at 8:15 AM. Your entry discarded."
     - Option to view both logs in edit history

7. **Data Integrity Check**
   - After sync, app validates:
     - All logs have `effectiveDateTime <= now()`
     - No duplicate logs for same scheduledTime (within 1-hour window)
     - Adherence calculations refresh with server timestamps

### Validation Checkpoints
- ✅ Offline writes complete in < 100ms (IndexedDB fast)
- ✅ Sync completes within 30 seconds of reconnection
- ✅ No data loss during offline period (Firestore queue persists)
- ✅ LWW conflicts resolve automatically (no user intervention needed)
- ✅ Optimistic UI never "flickers" on sync (server write = no-op if no conflict)
- ✅ Offline notification scheduling works for 30 days (local scheduling)

---

## Technical Validation Checklist

### Performance (From Constitution)
- [ ] UI response time p95 < 300ms for all logged actions
- [ ] Notification delivery < 5 minutes after scheduled time
- [ ] History queries (100 logs) complete < 500ms
- [ ] Sync latency < 30 seconds after reconnection
- [ ] App launch time < 2 seconds (cold start with cache)

### Reliability
- [ ] Crash rate < 1% across all scenarios
- [ ] Offline mode works for 7+ days without internet
- [ ] 100% notification delivery rate (local scheduling)
- [ ] Data integrity: No duplicate logs, no lost writes

### Security
- [ ] Firebase Auth required for all operations
- [ ] Security rules block unauthorized profile access
- [ ] Caregivers cannot exceed granted permissions
- [ ] 24-hour edit window enforced server-side

### Internationalization
- [ ] All UI text supports English + Vietnamese
- [ ] Date/time formats respect locale (US vs VN)
- [ ] Medication names support Unicode (Vietnamese diacritics)

### Accessibility (Future)
- [ ] Screen reader support (VoiceOver/TalkBack)
- [ ] Minimum touch target size: 44x44pt
- [ ] Color contrast ratios meet WCAG AA

---

## Running Validation Tests

### Unit Tests (Jest)
```bash
npm test -- --testPathPattern=scenarios
```

### Integration Tests (React Native Testing Library)
```bash
npm test -- --testPathPattern=integration
```

### End-to-End Tests (Detox)
```bash
# Scenario 1: Single-profile setup
detox test e2e/scenario-1-single-profile.e2e.ts

# Scenario 2: Multi-profile management
detox test e2e/scenario-2-multi-profile.e2e.ts

# Scenario 3: PRN medication
detox test e2e/scenario-3-prn-medication.e2e.ts

# Scenario 4: Caregiver monitoring
detox test e2e/scenario-4-caregiver.e2e.ts

# Scenario 5: Offline-first
detox test e2e/scenario-5-offline.e2e.ts
```

### Firebase Emulator Tests
```bash
# Start emulators
firebase emulators:start

# Run security rules tests
npm run test:rules
```

---

## Success Criteria (MVP)

From spec.md acceptance criteria:
- ✅ **≥50 beta users** successfully complete Scenario 1 (single-profile setup)
- ✅ **≥80% adherence logging rate** across all users (daily active logging)
- ✅ **≥8/10 satisfaction score** from beta user surveys
- ✅ **<1% crash rate** measured via Firebase Crashlytics
- ✅ **≥90% feature coverage** from automated E2E tests

When all 5 scenarios pass validation + success criteria met → **MVP READY FOR BETA LAUNCH** 🚀
