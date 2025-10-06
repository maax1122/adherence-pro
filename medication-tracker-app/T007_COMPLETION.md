# T007: Contract Test - Firestore Security Rules for MedicationRequests

**Status**: ✅ COMPLETED  
**Completed**: October 6, 2025  
**Task Reference**: specs/001-medication-family-tracker/tasks.md § T007

## Summary

Implemented comprehensive contract tests for Firestore security rules covering the `medication_requests` collection. Tests validate FHIR MedicationRequest resource access control, ensuring patients and caregivers can only access medication data according to their permissions.

## Deliverables

### Test File Created
- **Path**: `tests/contract/firestore-medication-requests.test.ts`
- **Lines of Code**: 800+ lines
- **Test Coverage**: 14 test cases across 10 test suites

### Test Cases Implemented

#### ✅ TEST 1: Patient can create MedicationRequest for own patientId
- Validates authenticated patient can create MedicationRequest
- Tests FHIR resourceType: "MedicationRequest"
- Tests valid status, intent, medicationName, dosageInstruction fields

#### ✅ TEST 2: Patient can read own MedicationRequests
- Validates patient can read their own medication requests
- Tests ownership verification (userId match)

#### ✅ TEST 3: Patient can update own MedicationRequests
- Validates patient can update status and other fields
- Tests ownership enforcement during updates

#### ✅ TEST 4: Patient can delete own MedicationRequests
- Validates patient can delete their medication requests
- Tests ownership enforcement during deletes

#### ❌ TEST 5: Unauthenticated user cannot access MedicationRequests (2 tests)
- Denies unauthenticated read access
- Denies unauthenticated create access
- Tests authentication requirement

#### ❌ TEST 6: User cannot read other users' MedicationRequests
- Denies cross-user access
- Tests user isolation enforcement

#### ✅ TEST 7: MedicationRequest must have valid FHIR fields
- Tests all required FHIR fields present
- Validates resourceType, status, intent, medicationName, dosageInstruction

#### ❌ TEST 8: MedicationRequest with invalid data rejected (4 validation tests)
- Rejects invalid status values (not in FHIR value set)
- Rejects missing resourceType
- Rejects empty medicationName
- Rejects empty dosageInstruction array
- Tests FHIR R4 compliance validation

#### ✅ TEST 9: Caregiver can read MedicationRequest for monitored patient
- Tests family_connections integration
- Validates caregiver with accepted connection can read
- Tests view_only permission level

#### ✅ TEST 10: Caregiver with can_log permission (3 tests)
- Validates caregiver with can_log can create MedicationRequest
- Validates caregiver with can_log can update MedicationRequest
- Denies caregiver with view_only from creating MedicationRequest
- Tests permission level enforcement (can_log vs view_only)

## Key Features

### 1. FHIR R4 Compliance
- Validates FHIR MedicationRequest resource structure
- Enforces status value set: ['active', 'on-hold', 'cancelled', 'completed', 'entered-in-error', 'stopped', 'draft']
- Enforces intent value set: ['proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'option']
- Validates required fields: resourceType, medicationName, dosageInstruction

### 2. Security Rule Testing
- Uses Firebase Emulator Suite + @firebase/rules-unit-testing
- Loads security rules from `specs/001-medication-family-tracker/contracts/firestore.rules`
- Tests authentication enforcement (authenticated vs unauthenticated)
- Tests ownership verification (userId matching)
- Tests caregiver permissions (family_connections integration)

### 3. Permission Levels
- **Owner (Patient)**: Full CRUD access to own medication requests
- **Caregiver with can_log**: Can create/read/update medication requests for monitored patient
- **Caregiver with view_only**: Can only read medication requests for monitored patient
- **Unauthenticated**: No access
- **Other users**: No access

### 4. Test Structure
- BeforeAll: Initialize test environment with security rules
- BeforeEach: Clear Firestore data (isolation between tests)
- AfterAll: Cleanup test environment
- Uses `testEnv.withSecurityRulesDisabled()` for test data setup
- Uses `assertSucceeds()` and `assertFails()` for security validation

## Technical Details

### Test Environment Configuration
```typescript
testEnv = await initializeTestEnvironment({
  projectId: 'test-medication-tracker',
  firestore: {
    rules,
    host: 'localhost',
    port: 8080,
  },
});
```

### Test Users
- **Alice (ALICE_UID)**: Primary patient user
- **Bob (BOB_UID)**: Secondary patient user (for cross-user tests)
- **Carol (CAROL_UID)**: Caregiver user

### Sample FHIR MedicationRequest Structure
```typescript
{
  resourceType: 'MedicationRequest',
  id: 'med-req-alice-001',
  userId: 'alice-user-id',
  patientId: 'patient-alice-001',
  status: 'active',
  intent: 'order',
  medicationName: 'Lisinopril 10mg',
  dosageInstruction: [
    {
      timing: {
        repeat: {
          frequency: 1,
          period: 1,
          periodUnit: 'day',
          timeOfDay: ['08:00'],
        },
      },
      doseAndRate: [
        {
          doseQuantity: {
            value: 10,
            unit: 'mg',
          },
        },
      ],
    },
  ],
  meta: {
    createdAt: Timestamp,
    lastUpdated: Timestamp,
  },
}
```

## Dependencies Met

✅ **T005**: Testing framework configured (Jest + @firebase/rules-unit-testing)  
✅ **firestore.rules**: Security rules file exists at `specs/001-medication-family-tracker/contracts/firestore.rules`

## Expected Test Behavior (TDD)

⚠️ **IMPORTANT**: All tests are currently expected to **FAIL** until T025 (Deploy Firestore Security Rules) is completed.

**Why tests should fail**:
- Security rules are defined but not deployed to Firebase Emulator
- Firebase Emulator defaults to deny-all when rules are not deployed
- This is correct TDD behavior: write failing tests first, implement later

**After T025 completion**:
- Deploy firestore.rules to Firebase Emulator
- Re-run tests: `npm run test:contract -- tests/contract/firestore-medication-requests.test.ts`
- All 14 test cases should PASS

## Validation Results

✅ **TypeScript Compilation**: Zero errors, zero warnings  
✅ **ESLint**: No linting issues  
✅ **Test Structure**: Follows T006 pattern (consistency)  
✅ **FHIR Compliance**: Validates all required FHIR R4 fields  
✅ **Security Coverage**: Tests all access control scenarios from contracts/firestore-security-rules.md

## Running the Tests

```bash
# Run T007 tests specifically
npm run test:contract -- tests/contract/firestore-medication-requests.test.ts

# Run all contract tests
npm run test:contract

# Run with Firebase Emulator (after T025)
# Terminal 1: Start emulator
firebase emulators:start --only firestore

# Terminal 2: Run tests
npm run test:contract
```

## Next Steps

1. **T008**: Create contract tests for MedicationAdministrations collection
2. **T009**: Create contract tests for FamilyConnections collection
3. **T010**: Create contract tests for Firestore indexes
4. **T025**: Deploy firestore.rules to Firebase Emulator → All contract tests should PASS

## Notes

- Test file mirrors production Firestore structure exactly
- Uses serverTimestamp() for createdAt/lastUpdated fields (Firebase server time)
- Uses Timestamp.now() for test data setup (client time)
- Family connections use composite key: `${caregiverUserId}_${patientId}`
- Permission levels: 'view_only' (read-only) vs 'can_log' (read + write)
- Connection status: 'pending' (invited), 'accepted' (active), 'rejected' (denied), 'revoked' (removed)

---

**Constitution Compliance**:
- ✅ Principle I: FHIR R4 compliance validated
- ✅ Principle II: TDD approach (tests written before implementation)
- ✅ Principle III: TypeScript strict mode enabled
- ✅ Principle IV: Security rules tested comprehensively
- ✅ Principle V: Code quality maintained (ESLint, Prettier)
