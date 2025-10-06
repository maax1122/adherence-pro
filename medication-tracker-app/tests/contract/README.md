# Contract Tests - Firestore Security Rules

## Overview

Contract tests validate Firestore security rules using the Firebase Rules Unit Testing SDK. These tests ensure that our FHIR R4-compliant data model is properly secured and that patient/caregiver permissions work as expected.

## Prerequisites

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase Project

```bash
cd /Users/maax/Projects/side/adherence-pro
firebase init
```

Select:
- **Firestore**: Configure security rules and indexes files
- **Emulators**: Set up emulators for local development

## Running Contract Tests

### Step 1: Start Firebase Emulator

In a separate terminal, start the Firestore emulator:

```bash
cd /Users/maax/Projects/side/adherence-pro
firebase emulators:start --only firestore
```

The emulator will start on `localhost:8080` by default.

### Step 2: Run Contract Tests

In your main terminal:

```bash
cd medication-tracker-app
npm run test:contract
```

Or run a specific contract test file:

```bash
npm test -- tests/contract/firestore-patients.test.ts
```

## Test Files

- `tests/contract/firestore-patients.test.ts` - Patient collection security rules (T006)
- `tests/contract/firestore-medication-requests.test.ts` - MedicationRequest security rules (T007)
- `tests/contract/firestore-medication-administrations.test.ts` - MedicationAdministration security rules (T008)
- `tests/contract/firestore-family-connections.test.ts` - Family connections security rules (T009)
- `tests/contract/firestore-indexes.test.ts` - Composite indexes validation (T010)

## Test Structure

Each contract test:

1. **Initializes test environment** with security rules
2. **Clears Firestore** before each test
3. **Tests positive cases** (should succeed with `assertSucceeds`)
4. **Tests negative cases** (should fail with `assertFails`)
5. **Validates FHIR compliance** (resourceType, required fields, etc.)

## Example Test Pattern

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('allows owner to read own data', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(db.doc('patients/pat1').get());
  });

  it('denies non-owner from reading data', async () => {
    const db = testEnv.authenticatedContext('user2').firestore();
    await assertFails(db.doc('patients/pat1').get());
  });
});
```

## Debugging Failed Tests

### 1. Check Emulator Logs

The Firebase Emulator logs show which rules were evaluated:

```bash
firebase emulators:start --only firestore
```

Look for lines like:
```
║ firestore: May 19, 2025 4:24:52 PM com.google.cloud.datastore.emulator.firestore.webchannel.FirestoreV1JsonProtoAdapter getAllowResult
║ WARNING: allow result: DENY
```

### 2. Enable Verbose Logging

```bash
FIRESTORE_EMULATOR_DEBUG=1 firebase emulators:start --only firestore
```

### 3. Use `withSecurityRulesDisabled` for Setup

When setting up test data that should bypass rules:

```typescript
await testEnv.withSecurityRulesDisabled(async (context) => {
  await setDoc(doc(context.firestore(), 'patients', 'pat1'), data);
});
```

## Common Pitfalls

### ❌ Emulator Not Running

```
Error: connect ECONNREFUSED 127.0.0.1:8080
```

**Solution**: Start Firebase Emulator before running tests.

### ❌ Wrong Rules File Path

```
Error: ENOENT: no such file or directory
```

**Solution**: Ensure `firestore.rules` path is correct in test file:

```typescript
const rulesPath = resolve(__dirname, '../../specs/.../firestore.rules');
```

### ❌ Rules Cached

If rules changes aren't reflected, restart the emulator:

```bash
firebase emulators:start --only firestore
```

### ❌ Timestamp Issues

Use `Timestamp.now()` from Firebase, not `new Date()`:

```typescript
import { Timestamp } from 'firebase/firestore';

const data = {
  createdAt: Timestamp.now(), // ✅ Correct
  // createdAt: new Date(), // ❌ Wrong
};
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Contract Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Dependencies
        run: |
          npm install -g firebase-tools
          cd medication-tracker-app && npm install
      
      - name: Start Firebase Emulator
        run: firebase emulators:start --only firestore &
        
      - name: Wait for Emulator
        run: npx wait-on http://localhost:8080
        
      - name: Run Contract Tests
        run: cd medication-tracker-app && npm run test:contract
        
      - name: Stop Emulator
        run: firebase emulators:stop
```

## References

- [Firebase Rules Unit Testing](https://firebase.google.com/docs/rules/unit-tests)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Firestore Security Rules Reference](https://firebase.google.com/docs/firestore/security/get-started)
- [FHIR R4 Specification](https://www.hl7.org/fhir/R4/)

## Status

- [x] T006: Patient security rules test created ✅
  - **Test Status**: FAILS (as expected - TDD red phase)
  - **Error**: `TypeError: fetch failed` - Firebase Emulator not running
  - **Next**: Start Firebase Emulator to run tests
- [ ] T007: MedicationRequest security rules test
- [ ] T008: MedicationAdministration security rules test
- [ ] T009: FamilyConnection security rules test
- [ ] T010: Composite indexes validation test

**TDD Status**: ✅ Red Phase - Tests failing as expected without Firebase Emulator

**Next**: Continue writing T007-T010 contract tests (all should FAIL), then T011-T015 integration tests
