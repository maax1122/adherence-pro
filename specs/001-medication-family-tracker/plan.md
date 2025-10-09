
# Implementation Plan: Medication Family Tracker (Web-First)

**Branch**: `001-medication-family-tracker` | **Date**: 2025-10-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/maax/Projects/side/adherence-pro/specs/001-medication-family-tracker/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Medication Family Tracker is a **web-first application** enabling users to manage medication adherence for themselves and family members. The system provides scheduled reminders via browser push notifications, intake logging, caregiver monitoring, offline functionality with Service Worker, and adherence analytics. Primary users include elderly patients taking multiple medications, caregivers monitoring compliance remotely, and families managing household health needs.

**Core Value Proposition**: Reduce medication non-adherence through timely reminders, easy logging, and family support, with special focus on elderly users and chronic disease management.

**Platform Strategy**: Phase 1 delivers a Progressive Web App (PWA) accessible on all devices via browser, with 70-90% code reusability for Phase 2 native mobile apps (iOS/Android). Web-first approach enables faster testing, instant deployment, and rapid iteration.

## Technical Context
**Language/Version**: TypeScript/JavaScript (React 18+ with Vite 5+)
**Primary Dependencies**: React, Firebase (Auth, Firestore, Cloud Messaging), Material UI or Chakra UI, React Router, Zustand
**Storage**: Firebase Firestore (cloud), IndexedDB (local offline cache via Service Worker)
**Testing**: Vitest, React Testing Library, Playwright (E2E), Firebase Emulator Suite
**Target Platform**: Modern web browsers (Chrome 90+, Safari 14+, Firefox 88+, Edge 90+), Progressive Web App
**Project Type**: Web (frontend + Firebase backend, PWA-enabled)
**Performance Goals**: 
  - UI response time: p95 < 300ms for user actions
  - Page load time: < 3 seconds on 3G connection
  - Lighthouse score: ≥90 for Performance, Accessibility, Best Practices
  - Notification delivery: < 5 minutes from scheduled time (browser/PWA open)
**Constraints**: 
  - Offline-capable via Service Worker for core features (reminders, logging, viewing)
  - Support 100 concurrent users in MVP (scalable to 100M future)
  - Cross-browser compatibility (Chrome, Safari, Firefox, Edge)
  - < 1% error rate across browsers
  - ≥70% browser notification permission grant rate
**Scale/Scope**: 
  - MVP: 50+ beta users, ~12-15 screens/pages
  - Per user: 5-10 family profiles, 10-30 medications per profile
  - Data volume: ~1000 log entries per user per month
  - Localization: English and Vietnamese
  - PWA installation target: ≥30% of active users

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Test-Driven Development (TDD) - NON-NEGOTIABLE
- [x] **All tests written before implementation**: Phase 3.2 creates all tests, Phase 3.3 implements
- [x] **Comprehensive test coverage planned**: Unit tests (components, hooks, utils), Integration tests (user flows), Contract tests (Firebase API interactions), E2E tests (Playwright)
- [x] **Tests are executable and repeatable**: Vitest + React Testing Library + Playwright for E2E
- **Status**: ✅ PASS - TDD workflow designed into task phases

### II. Code Quality Standards
- [x] **Linting/formatting configured in Phase 3.1**: ESLint, Prettier, TypeScript strict mode
- [x] **Zero tolerance policy**: TypeScript compiler with strict flags, ESLint with recommended rules
- [x] **Dependencies with version constraints**: package.json with exact versions for critical deps
- [x] **Security vulnerability monitoring**: npm audit, Firebase security updates
- **Status**: ✅ PASS - Quality tools in setup phase

### III. User Experience Consistency
- [x] **Predictable UI/UX patterns**: Material UI or Chakra UI component library with consistent design system
- [x] **Accessibility requirements**: WCAG 2.1 AA compliance, screen reader support, keyboard navigation, color contrast
- [x] **Error messages are actionable**: User-friendly error messages with next-step guidance
- [x] **Localization support**: i18n for English and Vietnamese
- [x] **Responsive design**: Mobile-first responsive layouts for all screen sizes
- **Status**: ✅ PASS - Consistent design system planned

### IV. Performance Requirements
- [x] **Target response times specified**: 300ms for UI actions, 3s page load, 5min for notifications
- [x] **Resource constraints defined**: Offline-first with Service Worker, efficient state management with Zustand
- [x] **Performance tests included**: Lighthouse CI, response time assertions in integration tests
- [x] **Scale expectations clear**: 100 concurrent MVP, 100M future scale
- **Status**: ✅ PASS - Performance requirements documented and measurable

### V. Documentation & Maintainability
- [x] **Complete spec.md exists**: ✅ Completed with web-first clarifications (Session 2)
- [x] **Implementation plan (this file)**: ✅ In progress
- [x] **Task breakdown planned**: Phase 2 will generate tasks.md
- [x] **API contracts documented**: Firebase Firestore schema, FHIR data models
- [x] **Semantic versioning**: Will follow in release process
- **Status**: ✅ PASS - Documentation structure in place

### Quality Gates Summary
- [x] Feature specification complete and reviewed (updated for web-first 2025-10-09)
- [x] All `[NEEDS CLARIFICATION]` markers resolved (9 initial + 4 web-first clarifications = 13 total)
- [x] User scenarios testable and unambiguous
- [x] Performance requirements specified (300ms UI, 3s load, Lighthouse ≥90, 5min notifications)
- [x] No implementation details leaked into specification

**Initial Constitution Check**: ✅ PASS - No violations, ready for Phase 0 research

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
adherence-web/
├── public/
│   ├── manifest.json           # PWA manifest (app name, icons, theme)
│   ├── sw.js                   # Service Worker (offline caching)
│   ├── firebase-messaging-sw.js # FCM service worker (push notifications)
│   ├── icons/                  # PWA icons (192x192, 512x512)
│   └── favicon.ico
├── src/
│   ├── components/             # React components
│   │   ├── auth/              # Login, Register, ForgotPassword
│   │   ├── medication/        # MedicationList, MedicationForm, MedicationCard
│   │   ├── family/            # FamilyList, FamilyForm, InviteCaregiver
│   │   ├── dashboard/         # AdherenceChart, Stats, Calendar
│   │   ├── notifications/     # NotificationBanner, ReminderModal
│   │   └── common/            # Button, Input, Modal, Loading, Error
│   ├── pages/                 # Route pages (React Router)
│   │   ├── HomePage.tsx       # Landing/welcome page
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── MedicationsPage.tsx # Main medication list
│   │   ├── MedicationDetailPage.tsx
│   │   ├── AddMedicationPage.tsx
│   │   ├── CalendarPage.tsx   # Medication calendar view
│   │   ├── DashboardPage.tsx  # Adherence analytics
│   │   ├── ProfilePage.tsx    # User settings & family profiles
│   │   └── FamilyPage.tsx     # Family connections management
│   ├── hooks/                 # Custom React hooks (REUSABLE for mobile)
│   │   ├── useAuth.ts
│   │   ├── useMedications.ts
│   │   ├── useReminders.ts
│   │   ├── useFamilyConnections.ts
│   │   └── useOfflineSync.ts
│   ├── services/              # Business logic (REUSABLE for mobile)
│   │   ├── firebase/
│   │   │   ├── config.ts      # Firebase initialization
│   │   │   ├── auth.ts        # Auth service
│   │   │   ├── firestore.ts   # Firestore helpers
│   │   │   └── messaging.ts   # FCM (Web Push)
│   │   ├── notifications/
│   │   │   └── scheduler.ts   # Reminder scheduling logic
│   │   ├── sync/
│   │   │   └── offlineSync.ts # Offline sync manager
│   │   └── storage/
│   │       └── localStorage.ts # Local storage helpers
│   ├── types/                 # TypeScript types (REUSABLE for mobile)
│   │   ├── fhir.ts           # FHIR R4 resource types
│   │   ├── User.ts
│   │   ├── Medication.ts
│   │   ├── MedicationLog.ts
│   │   ├── FamilyConnection.ts
│   │   └── ReminderSchedule.ts
│   ├── utils/                 # Utility functions (REUSABLE for mobile)
│   │   ├── datetime.ts
│   │   ├── validation.ts
│   │   ├── formatters.ts
│   │   └── fhir.ts           # FHIR helpers
│   ├── constants/             # App constants
│   │   ├── colors.ts
│   │   ├── routes.ts
│   │   └── config.ts
│   ├── i18n/                  # Internationalization (REUSABLE for mobile)
│   │   ├── index.ts
│   │   ├── en.json
│   │   └── vi.json
│   ├── store/                 # Zustand stores
│   │   ├── authStore.ts
│   │   ├── medicationStore.ts
│   │   └── uiStore.ts
│   ├── styles/                # Global styles
│   │   ├── theme.ts          # MUI/Chakra theme
│   │   └── global.css
│   ├── App.tsx                # Root component
│   ├── main.tsx               # Entry point
│   └── vite-env.d.ts
├── tests/                     # Test files
│   ├── unit/                  # Unit tests
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/           # Integration tests
│   │   ├── auth-flow.test.ts
│   │   ├── medication-flow.test.ts
│   │   ├── reminder-flow.test.ts
│   │   └── family-monitoring.test.ts
│   ├── contract/              # Contract tests (Firebase rules)
│   │   ├── firestore-patients.test.ts
│   │   ├── firestore-medication-requests.test.ts
│   │   ├── firestore-medication-administrations.test.ts
│   │   └── firestore-family-connections.test.ts
│   └── e2e/                   # End-to-end tests (Playwright)
│       ├── medication.spec.ts
│       └── caregiver.spec.ts
├── firebase/                  # Firebase config (REUSABLE for mobile)
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   ├── storage.rules
│   └── firebase.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
├── .eslintrc.js
└── .prettierrc
```

**Structure Decision**: Web application with React + Vite frontend and Firebase backend (serverless). Project uses flat structure with clear separation of concerns: components (UI), pages (routes), services (business logic), hooks (state), types (contracts), utils (helpers). ~70% of code (services, types, utils, i18n, firebase config) is designed to be reusable for Phase 2 mobile apps. PWA capabilities provided via manifest.json and Service Worker. All tests colocated in `/tests` directory following TDD principles.

## Phase 0: Outline & Research ✅

**Status**: ✅ Complete (2025-10-09)

### Technology Decisions Made

All technology choices have been researched and documented in `research.md`. Key decisions:

1. **Frontend Framework**: React 18+ with Vite 5+ (instant HMR, 70-90% code reusable for mobile)
2. **UI Library**: Material UI v5 (50+ accessible components, WCAG 2.1 AA compliant)
3. **State Management**: Zustand (1.2KB, TypeScript-friendly, 100% mobile-compatible)
4. **Routing**: React Router v6 (industry standard, code splitting, lazy loading)
5. **Backend**: Firebase (Auth, Firestore, Cloud Messaging, Hosting, Cloud Functions)
6. **Data Model**: FHIR R4 compliant (Patient, MedicationRequest, MedicationAdministration, RelatedPerson, CareTeam, ReminderSchedule)
7. **Notifications**: Web Push API via FCM (browser notifications, Service Worker)
8. **Offline Support**: Service Worker + Workbox + IndexedDB + Firestore offline persistence
9. **Testing**: Vitest (unit), React Testing Library (components), Playwright (E2E), Firebase Emulator (contracts)
10. **Hosting**: Firebase Hosting + GitHub Actions CI/CD (preview channels, auto-deploy)

### Research Outcomes

- **No NEEDS CLARIFICATION markers** remaining in spec.md (all resolved in Session 1 + Session 2)
- **All alternatives evaluated**: 40+ technology options considered with rationale documented
- **Performance benchmarks defined**: Lighthouse ≥90, FCP < 1.5s, LCP < 2.5s, TTI < 3s, bundle < 200KB
- **Browser support matrix**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ (PWA compatible)
- **Code reusability analysis**: 70-85% of codebase (services, types, utils, i18n, Firebase config) reusable for Phase 2 mobile
- **Risk assessment**: 10 risks identified with mitigations (notification permissions, Safari PWA limitations, offline conflicts)

### Architecture Decisions

**Offline-First**:
- Firestore offline persistence (read from local cache first)
- Service Worker caching strategies (cache-first for static assets, network-first for API)
- Optimistic UI updates (instant feedback, background sync)
- Last-Write-Wins conflict resolution for MVP

**PWA Capabilities**:
- Progressive Web App manifest (`manifest.json`)
- Service Worker for offline functionality
- Install to Home Screen prompt (target 30%+ installation rate)
- Web Push notifications (requires user permission)

**Security**:
- Firebase Security Rules (row-level access control)
- HTTPS required (Service Workers mandate)
- FHIR-compliant data model (healthcare interoperability)

**Output**: ✅ `research.md` (complete, 10 decisions, 400+ lines, all unknowns resolved)

## Phase 1: Design & Contracts
*Prerequisites: ✅ research.md complete*

### Deliverables

1. **data-model.md** - FHIR R4 data model for Firestore
2. **contracts/firestore-security-rules.md** - Firestore Security Rules with validation
3. **contracts/firestore.indexes.json** - Composite indexes for queries
4. **contracts/** - Contract tests (Firestore CRUD operations)
5. **quickstart.md** - 5 integration test scenarios (user flows)
6. **.github/copilot-instructions.md** - Updated agent guidance with web stack

### Approach

#### 1. Extract FHIR entities from spec.md → `data-model.md`

**Source**: spec.md Functional Requirements (FR-001 to FR-052)

**FHIR R4 Resources** (100% reusable for mobile):
- **Patient**: User/family member profiles (name, DOB, gender, photo, language preference)
  - Fields: `identifier`, `name`, `birthDate`, `gender`, `photo`, `language`, `meta`
  - Relationships: Has many `MedicationRequest`, has many `RelatedPerson`
- **MedicationRequest**: Prescribed medications (drug name, dosage, frequency, instructions)
  - Fields: `identifier`, `medicationCodeableConcept`, `dosageInstruction`, `authoredOn`, `requester`, `subject`, `status`
  - Relationships: Belongs to `Patient`, has many `MedicationAdministration`, has one `ReminderSchedule`
- **MedicationAdministration**: Medication intake logs (timestamp, dose, notes, photos)
  - Fields: `identifier`, `medicationReference`, `effectiveDateTime`, `dosage`, `note`, `performer`, `status`
  - Relationships: Belongs to `MedicationRequest`, belongs to `Patient`
- **RelatedPerson**: Caregiver relationships (caregiver linked to patient, role)
  - Fields: `identifier`, `patient` (reference), `name`, `relationship`, `photo`, `active`
  - Relationships: Belongs to `Patient`
- **CareTeam**: Family care team structure (patient + list of caregivers)
  - Fields: `identifier`, `subject` (patient reference), `participant[]` (caregiver references), `status`
  - Relationships: Has one `Patient`, has many `RelatedPerson`
- **ReminderSchedule**: Custom FHIR extension for reminder scheduling
  - Fields: `identifier`, `medicationRequestReference`, `schedule` (cron-like), `timezone`, `enabled`, `notificationPreferences`
  - Relationships: Belongs to `MedicationRequest`

**Firestore Collection Structure** (optimized for queries):
```
/patients/{patientId}
/medication_requests/{medicationRequestId}
/medication_administrations/{administrationId}
/related_persons/{relatedPersonId}
/care_teams/{careTeamId}
/reminder_schedules/{scheduleId}
/family_connections/{connectionId}  # Join table for patient-caregiver relationships
```

**Output**: `data-model.md` with entity definitions, field types, validation rules, relationships

#### 2. Generate Firestore Security Rules → `contracts/firestore-security-rules.md`

**Requirements from spec.md**:
- FR-016: Authentication required for all actions
- FR-017: Users can only access their own data
- FR-042: Caregivers can view patient data with permission
- FR-044: Caregivers cannot delete patient medications (read-only except logging intake)

**Security Rules Pattern**:
```javascript
// Example: MedicationRequest access control
match /medication_requests/{medicationRequestId} {
  allow read: if isOwner() || isCaregiver();
  allow create: if isOwner();
  allow update: if isOwner();
  allow delete: if isOwner();
  
  function isOwner() {
    return request.auth.uid == resource.data.subject.reference.split('/')[1];
  }
  
  function isCaregiver() {
    return exists(/databases/$(database)/documents/family_connections/$(request.auth.uid + '_' + resource.data.subject.reference.split('/')[1]));
  }
}
```

**Output**: `contracts/firestore-security-rules.md` with rules for all 7 collections

#### 3. Generate Composite Indexes → `contracts/firestore.indexes.json`

**Queries from spec.md**:
- FR-006: List medications filtered by patient, sorted by next dose time
- FR-009: View medication history (logs) for specific medication, paginated, sorted by timestamp DESC
- FR-021: Filter PRN medications vs scheduled medications
- FR-042: List all medications for patients under caregiver's care

**Indexes Required**:
```json
{
  "indexes": [
    {
      "collectionGroup": "medication_requests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "subject.reference", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "authoredOn", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "medication_administrations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "medicationReference.reference", "order": "ASCENDING" },
        { "fieldPath": "effectiveDateTime", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Output**: `contracts/firestore.indexes.json` with all composite indexes

#### 4. Generate Contract Tests → `tests/contract/`

**Test Files** (following TDD - these tests will FAIL until implementation):
- `tests/contract/firestore-patients.test.ts`: CRUD operations for Patient resource
- `tests/contract/firestore-medication-requests.test.ts`: CRUD for MedicationRequest with security rules validation
- `tests/contract/firestore-medication-administrations.test.ts`: Intake logging with caregiver permissions
- `tests/contract/firestore-family-connections.test.ts`: Caregiver invitations and access control
- `tests/contract/firestore-security-rules.test.ts`: Security rules for all collections (deny unauthorized access)
- `tests/contract/firestore-indexes.test.ts`: Validate indexes exist for complex queries

**Test Pattern** (using Firebase Emulator):
```typescript
describe('MedicationRequest Security Rules', () => {
  it('should allow patient to create their own medication', async () => {
    const patientDb = testEnv.authenticatedContext('patient123');
    await assertSucceeds(
      patientDb.collection('medication_requests').add({
        subject: { reference: 'Patient/patient123' },
        // ... other fields
      })
    );
  });
  
  it('should deny patient from creating medication for another patient', async () => {
    const patientDb = testEnv.authenticatedContext('patient123');
    await assertFails(
      patientDb.collection('medication_requests').add({
        subject: { reference: 'Patient/patient456' },
        // ... other fields
      })
    );
  });
});
```

**Output**: Contract tests in `tests/contract/` (all failing initially)

#### 5. Extract Test Scenarios from User Stories → `quickstart.md`

**Source**: spec.md User Scenarios (5 scenarios)

**Integration Test Scenarios** (browser-based, web-specific):

**Scenario 1: Single Profile Setup**
- User registers with email/password
- Creates patient profile (name, DOB, photo)
- Adds first medication (name, dosage, schedule)
- Receives browser notification at scheduled time
- Logs medication intake with timestamp
- Views adherence history (calendar view)

**Scenario 2: Multi-Profile Family Management**
- Parent creates profiles for 2 children
- Adds medications for each child (different schedules)
- Switches between profiles in dropdown
- Receives notifications for both children
- Logs intake for each child separately
- Views adherence dashboard with all profiles

**Scenario 3: PRN Medication**
- Caregiver adds PRN medication (Tylenol)
- Provides instructions (what, how much, when, photo)
- Patient searches PRN medication list
- Logs intake with timestamp and notes
- System tracks frequency (e.g., "Taken 3 times today")

**Scenario 4: Caregiver Monitoring**
- Parent sends caregiver invitation via email
- Caregiver accepts invitation (email link)
- Caregiver views patient's medication list (read-only)
- Patient misses medication dose (15 min grace period)
- Caregiver receives browser push notification
- Caregiver logs intake on behalf of patient

**Scenario 5: Offline Usage**
- User goes offline (browser DevTools network throttling)
- Views medication list (cached)
- Logs medication intake (queued locally)
- Returns online (automatic sync)
- Caregiver sees updated adherence log (real-time)

**Output**: `quickstart.md` with 5 scenarios as integration test specifications

#### 6. Update Agent Guidance File → `.github/copilot-instructions.md`

**Update Strategy** (incremental, not full rewrite):
- Run `.specify/scripts/bash/update-agent-context.sh copilot`
  - **IMPORTANT**: Execute exactly as specified above. Do not add or remove any arguments.
- Add **NEW** technologies from Phase 0 research (React 18+, Vite 5+, MUI v5, Zustand, Playwright, Vitest)
- Preserve manual additions between `<!-- MANUAL ADDITIONS START -->` and `<!-- MANUAL ADDITIONS END -->` markers
- Update "Recent Changes" section (keep last 3 entries)
- Keep total file under 150 lines (token efficiency for GitHub Copilot context window)

**Output**: `.github/copilot-instructions.md` updated with web-first stack

---

**Phase 1 Outputs Summary**:
- ✅ `data-model.md` - FHIR R4 entities with Firestore schema
- ✅ `contracts/firestore-security-rules.md` - Security rules with FHIR validation
- ✅ `contracts/firestore.indexes.json` - Composite indexes
- ✅ `tests/contract/*.test.ts` - Contract tests (failing, TDD)
- ✅ `quickstart.md` - 5 integration test scenarios
- ✅ `.github/copilot-instructions.md` - Updated agent guidance

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

**Inputs**:
- `data-model.md` - FHIR R4 entities (7 resources)
- `contracts/firestore-security-rules.md` - Security rules
- `contracts/firestore.indexes.json` - Composite indexes
- `tests/contract/*.test.ts` - Contract tests (6 files)
- `quickstart.md` - Integration test scenarios (5 scenarios)

**Task Generation Logic**:
1. Load `.specify/templates/tasks-template.md` as base template
2. **For each FHIR resource** in `data-model.md`:
   - Task: Create TypeScript types (`src/types/fhir.ts`) [P]
   - Task: Create Firestore converter (`src/services/firestore/converters.ts`) [P]
3. **For each contract test** in `tests/contract/`:
   - Task: Create contract test file (failing test first) [P]
4. **For each Firestore service** (auth, medications, patients, family, reminders, notifications):
   - Task: Create service file with CRUD operations (`src/services/*/`) [P]
   - Dependency: FHIR types and converters must exist
5. **For each integration scenario** in `quickstart.md`:
   - Task: Create integration test file (`tests/integration/`) [P]
6. **For each React component** (inferred from scenarios):
   - Task: Create component test (RTL) (`tests/unit/components/`)
   - Task: Implement component (`src/components/`)
7. **For each page/route** (dashboard, medications, family, settings):
   - Task: Create page component (`src/pages/`)
   - Dependency: Components and services must exist
8. **Infrastructure tasks**:
   - Task: Setup Vite + React project structure
   - Task: Setup Firebase config and emulator
   - Task: Configure Vitest + RTL + Playwright
   - Task: Create Service Worker with Workbox
   - Task: Create PWA manifest.json
   - Task: Setup GitHub Actions CI/CD

**Ordering Strategy** (TDD + Dependency-Aware):
1. **Setup** (T001-T005): Project structure, Firebase, testing framework
2. **Contracts First** (T006-T010): Contract tests (failing), FHIR types, converters
3. **Services Layer** (T011-T020): Firebase services (make contract tests pass)
4. **State Management** (T021-T025): Zustand stores
5. **UI Components** (T026-T040): Component tests + implementations (parallel where possible)
6. **Pages/Routes** (T041-T050): Page components + routing
7. **Integration Tests** (T051-T055): Implement 5 scenarios from quickstart.md
8. **PWA Features** (T056-T060): Service Worker, offline support, notifications
9. **E2E Tests** (T061-T065): Playwright tests for critical paths
10. **Polish** (T066-T070): i18n, accessibility, performance optimization, deployment

**Parallelization** (mark [P] for tasks with no dependencies):
- All contract tests can run in parallel [P]
- All FHIR types can be created in parallel [P]
- All service files can be created in parallel after types exist [P]
- All component tests can run in parallel [P]
- All page components can be created in parallel after components/services exist [P]

**Estimated Output**: **60-70 tasks** total (more than mobile due to web-specific PWA setup, but tasks are smaller and faster to execute in browser)

**Task Priority** (P0 = critical path):
- P0: Setup, Firebase config, FHIR types, contract tests, core services
- P1: State management, auth UI, medication CRUD UI, integration tests
- P2: Family management, notifications, PWA features, E2E tests
- P3: Polish (i18n, a11y, performance, deployment)

**IMPORTANT**: This phase is executed by the `/tasks` command, NOT by `/plan`

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

**Status**: ✅ No violations detected

All constitutional principles satisfied for web-first approach:

1. **TDD Principle**: All tests written before implementation (contract tests, integration tests, E2E tests)
2. **Code Quality**: TypeScript strict mode, ESLint, Prettier, Husky pre-commit hooks
3. **UX Consistency**: Material UI design system, responsive breakpoints, accessibility (WCAG 2.1 AA)
4. **Performance**: Lighthouse ≥90, code splitting, lazy loading, < 200KB bundle, < 3s page load
5. **Documentation**: JSDoc comments, README, inline code comments for complex logic

**No complexity deviations requiring justification.**

---

## Progress Tracking

### Phase Status
- [x] **Phase 0**: Research complete ✅ (2025-10-09)
  - research.md created with 10 technology decisions
  - All alternatives evaluated with rationale
  - Browser support matrix defined
  - Performance benchmarks specified
  - Risk assessment with mitigations
  - Code reusability analysis (70-85% for mobile)
  
- [ ] **Phase 1**: Design complete ⏳ (Next: Generate data-model.md, contracts/, quickstart.md)
  - [ ] data-model.md - FHIR R4 entities
  - [ ] contracts/firestore-security-rules.md - Security rules
  - [ ] contracts/firestore.indexes.json - Composite indexes
  - [ ] tests/contract/*.test.ts - Contract tests (failing, TDD)
  - [ ] quickstart.md - 5 integration scenarios
  - [ ] .github/copilot-instructions.md - Agent guidance update
  
- [ ] **Phase 2**: Task planning approach documented ✅ (described in plan.md, awaits /tasks command)
  - Task generation logic defined
  - 60-70 tasks estimated (web-specific PWA setup)
  - TDD ordering strategy specified
  - Parallelization opportunities marked
  
- [ ] **Phase 3**: Tasks generated ⏳ (awaits /tasks command)
  
- [ ] **Phase 4**: Implementation complete ⏳ (awaits task execution)
  
- [ ] **Phase 5**: Validation passed ⏳ (awaits implementation)

### Constitutional Gate Status
- [x] **Initial Constitution Check**: ✅ PASS
  - All 5 principles validated (see Constitution Check section above)
  - No NEEDS CLARIFICATION markers in spec.md
  - 13 clarifications resolved (Session 1: 12, Session 2: 4 web-specific)
  - Performance requirements measurable (Lighthouse, load time, response time)
  - Browser compatibility defined (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
  
- [ ] **Post-Design Constitution Check**: ⏳ PENDING
  - To be executed after Phase 1 (data-model.md, contracts/, quickstart.md) complete
  - Expected result: PASS (no violations anticipated)
  
- [x] **All NEEDS CLARIFICATION Resolved**: ✅ YES
  - Session 1: 12 questions answered
  - Session 2: 4 web-specific questions answered
  - No remaining unknowns in spec.md
  
- [x] **Complexity Deviations Documented**: ✅ N/A (no violations)

### Web-First Milestones
- [x] Spec updated for web platform ✅ (2025-10-09)
- [x] Research completed for web stack ✅ (2025-10-09)
- [x] Plan updated for web architecture ✅ (2025-10-09)
- [ ] Phase 1 design artifacts generated ⏳ (data-model.md, contracts/, quickstart.md)
- [ ] Phase 2 tasks.md generated ⏳ (/tasks command)
- [ ] Phase 3 implementation started ⏳
- [ ] Phase 4 MVP deployed to Firebase Hosting ⏳
- [ ] Phase 5 performance validated (Lighthouse ≥90) ⏳

### Code Reusability Tracker (for Phase 2 Mobile)
- **100% Reusable**: FHIR types, utils, i18n, Firebase config, security rules, indexes, Cloud Functions
- **90-95% Reusable**: Firebase services, Zustand stores, custom hooks
- **70-80% Reusable**: Notification service (Web Push API → Expo Notifications)
- **10-20% Reusable**: React components (MUI → React Native Paper), routing (React Router → React Navigation)
- **0% Reusable**: Service Worker, PWA manifest, Vite config, Playwright E2E tests

**Estimated Migration Effort** (Phase 1 Web → Phase 2 Mobile): 2-3 weeks (70-85% code reuse, only UI layer rewrite)

---

**Plan Version**: 2.0 (Web-First)  
**Last Updated**: 2025-10-09  
**Status**: ✅ Phase 0 Complete, ⏳ Phase 1 Next (Generate data-model.md, contracts/, quickstart.md)  
**Based on**: Constitution v2.1.1 (see `/memory/constitution.md`)
