
# Implementation Plan: Medication Family Tracker

**Branch**: `001-medication-family-tracker` | **Date**: 2025-10-06 | **Spec**: [spec.md](./spec.md)
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

Medication Family Tracker is a cross-platform mobile application (iOS & Android) enabling users to manage medication adherence for themselves and family members. The system provides scheduled reminders, intake logging, caregiver monitoring, offline functionality with cloud sync, and adherence analytics. Primary users include elderly patients taking multiple medications, caregivers monitoring compliance remotely, and families managing household health needs.

**Core Value Proposition**: Reduce medication non-adherence through timely reminders, easy logging, and family support, with special focus on elderly users and chronic disease management.

## Technical Context
**Language/Version**: TypeScript/JavaScript (React Native with Expo SDK 50+)
**Primary Dependencies**: React Native, Expo, Firebase (Auth, Firestore, Cloud Messaging), AsyncStorage
**Storage**: Firebase Firestore (cloud), AsyncStorage (local offline cache)
**Testing**: Jest, React Native Testing Library, Detox (E2E), Firebase Emulator Suite
**Target Platform**: iOS 15+ and Android 10+ (mobile apps)
**Project Type**: Mobile (React Native cross-platform with Firebase backend)
**Performance Goals**: 
  - UI response time: p95 < 300ms for user actions
  - Notification delivery: < 5 minutes from scheduled time
  - App launch time: < 3 seconds cold start
  - Offline-first with background sync
**Constraints**: 
  - Offline-capable for core features (reminders, logging, viewing)
  - Support 100 concurrent users in MVP (scalable to 100M future)
  - Cross-platform parity (iOS/Android feature equivalence)
  - < 1% crash rate
  - 95% notification delivery reliability
**Scale/Scope**: 
  - MVP: 50+ beta users, ~15-20 screens
  - Per user: 5-10 family profiles, 10-30 medications per profile
  - Data volume: ~1000 log entries per user per month
  - Localization: English and Vietnamese

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Test-Driven Development (TDD) - NON-NEGOTIABLE
- [x] **All tests written before implementation**: Phase 3.2 creates all tests, Phase 3.3 implements
- [x] **Comprehensive test coverage planned**: Unit tests (components, utils), Integration tests (user flows), Contract tests (Firebase API interactions)
- [x] **Tests are executable and repeatable**: Jest + React Native Testing Library + Detox for E2E
- **Status**: ✅ PASS - TDD workflow designed into task phases

### II. Code Quality Standards
- [x] **Linting/formatting configured in Phase 3.1**: ESLint, Prettier, TypeScript strict mode
- [x] **Zero tolerance policy**: TypeScript compiler with strict flags, ESLint with recommended rules
- [x] **Dependencies with version constraints**: package.json with exact versions for critical deps
- [x] **Security vulnerability monitoring**: npm audit, Expo security updates
- **Status**: ✅ PASS - Quality tools in setup phase

### III. User Experience Consistency
- [x] **Predictable UI/UX patterns**: Material Design 3 / iOS Human Interface Guidelines via React Native Paper
- [x] **Accessibility requirements**: Screen reader support, sufficient color contrast, touch target sizes
- [x] **Error messages are actionable**: User-friendly error messages with next-step guidance
- [x] **Localization support**: i18n for English and Vietnamese
- **Status**: ✅ PASS - Consistent design system planned

### IV. Performance Requirements
- [x] **Target response times specified**: 300ms for UI actions, 5min for notifications
- [x] **Resource constraints defined**: Offline-first architecture, efficient state management
- [x] **Performance tests included**: Response time assertions in integration tests, memory profiling
- [x] **Scale expectations clear**: 100 concurrent MVP, 100M future scale
- **Status**: ✅ PASS - Performance requirements documented and testable

### V. Documentation & Maintainability
- [x] **Complete spec.md exists**: ✅ Completed with all clarifications resolved
- [x] **Implementation plan (this file)**: ✅ In progress
- [x] **Task breakdown planned**: Phase 2 will generate tasks.md
- [x] **API contracts documented**: Firebase Firestore schema, data models
- [x] **Semantic versioning**: Will follow in release process
- **Status**: ✅ PASS - Documentation structure in place

### Quality Gates Summary
- [x] Feature specification complete and reviewed
- [x] All `[NEEDS CLARIFICATION]` markers resolved (9 clarifications completed)
- [x] User scenarios testable and unambiguous
- [x] Performance requirements specified (300ms UI, 5min notifications, 95% uptime)
- [x] No implementation details leaked into specification

**Initial Constitution Check**: ✅ PASS - No violations, ready for Phase 0 research

---

### Post-Design Constitution Check (After Phase 1)
*Re-evaluation after data model and contracts complete*

#### I. Test-Driven Development (TDD) - NON-NEGOTIABLE
- [x] **Data model testable**: FHIR resources have clear validation rules in security rules
- [x] **Contract tests defined**: firestore-security-rules.md includes unit test examples
- [x] **Integration test scenarios**: quickstart.md defines 5 complete E2E scenarios
- **Status**: ✅ PASS - Testability maintained through design

#### II. Code Quality Standards
- [x] **Type safety enhanced**: FHIR TypeScript interfaces with strict typing
- [x] **Schema validation**: Firestore security rules validate FHIR resource structure
- [x] **No complexity increase**: FHIR adds structure, not complexity (standard patterns)
- **Status**: ✅ PASS - Type safety improved with FHIR

#### III. User Experience Consistency
- [x] **FHIR transparent to users**: Backend uses FHIR, UI remains user-friendly
- [x] **Performance not degraded**: Dual storage (simplified + fhirResource) optimizes queries
- [x] **Offline-first preserved**: FHIR resources cached locally with IndexedDB
- **Status**: ✅ PASS - UX unchanged, backend improved

#### IV. Performance Requirements
- [x] **Query optimization**: Composite indexes defined for all access patterns
- [x] **Denormalization strategy**: userId, patientId duplicated for fast lookups
- [x] **Flat collections**: Firestore flat structure prevents deep query nesting
- [x] **30-day reminder window**: Pre-computed instances balance accuracy vs storage
- **Status**: ✅ PASS - Performance targets achievable with current design

#### V. Documentation & Maintainability
- [x] **FHIR resources documented**: Complete TypeScript interfaces with FHIR R4 compliance
- [x] **Migration path clear**: Custom schema → FHIR mapping documented
- [x] **Future integration enabled**: FHIR export/import ready for EHR/pharmacy APIs
- [x] **Quickstart scenarios complete**: 5 user stories with technical validation
- **Status**: ✅ PASS - Documentation complete, maintainable

**Post-Design Constitution Check**: ✅ PASS - FHIR compliance adds structure without violating principles

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
medication-tracker-app/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── index.tsx            # Medications list
│   │   ├── calendar.tsx         # Medication calendar
│   │   ├── dashboard.tsx        # Adherence analytics
│   │   └── profile.tsx          # User profile/settings
│   ├── medication/              # Medication management screens
│   │   ├── [id].tsx            # Medication details
│   │   ├── add.tsx             # Add medication
│   │   └── edit/[id].tsx       # Edit medication
│   ├── family/                  # Family management screens
│   │   ├── index.tsx           # Family members list
│   │   ├── add.tsx             # Add family member
│   │   └── [id].tsx            # Family member details
│   └── _layout.tsx             # Root layout
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── medication/         # Medication-specific components
│   │   ├── common/             # Common UI elements
│   │   └── notifications/      # Notification components
│   ├── hooks/                   # Custom React hooks
│   │   ├── useMedications.ts
│   │   ├── useReminders.ts
│   │   └── useOfflineSync.ts
│   ├── services/                # Business logic & Firebase
│   │   ├── firebase/           # Firebase service layer
│   │   │   ├── auth.ts
│   │   │   ├── firestore.ts
│   │   │   └── messaging.ts
│   │   ├── notifications/      # Notification scheduling
│   │   ├── sync/               # Offline sync logic
│   │   └── storage/            # Local storage (AsyncStorage)
│   ├── models/                  # TypeScript interfaces/types
│   │   ├── User.ts
│   │   ├── Medication.ts
│   │   ├── MedicationLog.ts
│   │   ├── FamilyConnection.ts
│   │   └── ReminderSchedule.ts
│   ├── utils/                   # Utility functions
│   │   ├── datetime.ts
│   │   ├── validation.ts
│   │   └── formatters.ts
│   ├── constants/               # App constants
│   │   ├── colors.ts
│   │   └── config.ts
│   └── i18n/                    # Internationalization
│       ├── en.json
│       └── vi.json
├── __tests__/                   # Test files
│   ├── unit/                    # Unit tests
│   │   ├── components/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/             # Integration tests
│   │   ├── medication-flow.test.ts
│   │   ├── reminder-flow.test.ts
│   │   └── family-monitoring.test.ts
│   └── e2e/                     # End-to-end tests (Detox)
│       ├── medication.e2e.ts
│       └── caregiver.e2e.ts
├── assets/                      # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
├── firebase/                    # Firebase config
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── storage.rules
├── app.json                     # Expo configuration
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
└── .prettierrc
```

**Structure Decision**: React Native mobile app with Expo for cross-platform development (iOS/Android). Firebase handles authentication, data storage (Firestore), and push notifications (FCM). Expo Router for file-based navigation. AsyncStorage for offline data persistence. This structure supports offline-first architecture with automatic sync when online.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ 2025-10-06
- [x] Phase 1: Design complete (/plan command) - ✅ 2025-10-06
- [x] Phase 2: Task planning approach described (/plan command) - ✅ 2025-10-06
- [x] Phase 3: Tasks generated (/tasks command) - ✅ 2025-10-06 - **35 tasks ready**
- [ ] Phase 4: Implementation execution (manual or via task runner)
- [ ] Phase 5: Validation & testing complete

**Phase 1 Outputs**:
- ✅ `research.md` - 10 technical decisions documented
- ✅ `data-model.md` - FHIR R4 compliant resources (Patient, MedicationRequest, MedicationAdministration, RelatedPerson, CareTeam, ReminderSchedule)
- ✅ `contracts/firestore-security-rules.md` - Security rules with FHIR validation
- ✅ `contracts/firestore.indexes.json` - Composite indexes for all queries
- ✅ `quickstart.md` - 5 user story validation scenarios
- ✅ `.github/copilot-instructions.md` - Agent guidance updated

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅ (FHIR compliance, no violations)
- [x] All NEEDS CLARIFICATION resolved ✅ (9 clarifications completed)
- [x] Complexity deviations documented ✅ (None - FHIR adds structure, not complexity)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
