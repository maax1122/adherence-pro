/**
 * T006: Contract Test - Firestore Security Rules for Patients
 * 
 * Tests FHIR Patient collection security rules to ensure:
 * - Users can only create/read/update their own Patient documents
 * - Unauthenticated users cannot access Patient data
 * - Caregivers can read Patients they monitor (accepted connections)
 * - Caregivers with pending connections cannot read Patients
 * - Patient documents validate FHIR resourceType = "Patient"
 * - Invalid Patient documents are rejected
 * 
 * @requires Firebase Emulator Suite running on localhost:8080
 * @requires firestore.rules deployed to emulator
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

describe('T006: Firestore Security Rules - Patients Collection', () => {
  let testEnv: RulesTestEnvironment;

  // Test user IDs
  const ALICE_UID = 'alice-user-id';
  const BOB_UID = 'bob-user-id';
  const CAROL_UID = 'carol-caregiver-id';

  // Test patient IDs
  const ALICE_PATIENT_ID = 'patient-alice-001';
  const BOB_PATIENT_ID = 'patient-bob-001';

  beforeAll(async () => {
    // Load Firestore security rules from the spec
    // Test file: /medication-tracker-app/tests/contract/firestore-patients.test.ts
    // Rules file: /specs/001-medication-family-tracker/contracts/firestore.rules
    // Navigate: ../.. to /medication-tracker-app, then ../specs/
    const rulesPath = resolve(
      __dirname,
      '../../../specs/001-medication-family-tracker/contracts/firestore.rules',
    );
    const rules = readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: 'test-medication-tracker',
      firestore: {
        rules,
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

  describe('✅ TEST 1: User can create own Patient document (authenticated)', () => {
    it('should allow authenticated user to create their own Patient', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const patientRef = doc(aliceDb, 'patients', ALICE_PATIENT_ID);

      const patientData = {
        resourceType: 'Patient',
        id: ALICE_PATIENT_ID,
        userId: ALICE_UID,
        active: true,
        name: [
          {
            use: 'official',
            text: 'Alice Nguyen',
            family: 'Nguyen',
            given: ['Alice'],
          },
        ],
        birthDate: '1990-05-15',
        gender: 'female',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          versionId: '1',
        },
      };

      await assertSucceeds(setDoc(patientRef, patientData));
    });
  });

  describe('❌ TEST 2: Unauthenticated user cannot create Patient', () => {
    it('should deny unauthenticated user from creating Patient', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const patientRef = doc(unauthDb, 'patients', ALICE_PATIENT_ID);

      const patientData = {
        resourceType: 'Patient',
        id: ALICE_PATIENT_ID,
        userId: ALICE_UID,
        active: true,
        name: [
          {
            use: 'official',
            text: 'Alice Nguyen',
            family: 'Nguyen',
            given: ['Alice'],
          },
        ],
        birthDate: '1990-05-15',
        gender: 'female',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(patientRef, patientData));
    });
  });

  describe('✅ TEST 3: User can read own Patient documents', () => {
    it('should allow user to read their own Patient document', async () => {
      // Setup: Alice creates a Patient
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const patientRef = doc(aliceDb, 'patients', ALICE_PATIENT_ID);

      const patientData = {
        resourceType: 'Patient',
        id: ALICE_PATIENT_ID,
        userId: ALICE_UID,
        active: true,
        name: [
          {
            use: 'official',
            text: 'Alice Nguyen',
            family: 'Nguyen',
            given: ['Alice'],
          },
        ],
        birthDate: '1990-05-15',
        gender: 'female',
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'patients', ALICE_PATIENT_ID), patientData);
      });

      // Test: Alice can read her own Patient
      await assertSucceeds(getDoc(patientRef));
    });
  });

  describe('❌ TEST 4: User cannot read other users\' Patients', () => {
    it('should deny user from reading another user\'s Patient document', async () => {
      // Setup: Create Bob's Patient (with rules disabled)
      const bobPatientData = {
        resourceType: 'Patient',
        id: BOB_PATIENT_ID,
        userId: BOB_UID,
        active: true,
        name: [
          {
            use: 'official',
            text: 'Bob Smith',
            family: 'Smith',
            given: ['Bob'],
          },
        ],
        birthDate: '1985-08-20',
        gender: 'male',
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'patients', BOB_PATIENT_ID), bobPatientData);
      });

      // Test: Alice tries to read Bob's Patient
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const bobPatientRef = doc(aliceDb, 'patients', BOB_PATIENT_ID);

      await assertFails(getDoc(bobPatientRef));
    });
  });

  describe('✅ TEST 5: Caregiver can read Patient they monitor (accepted connection)', () => {
    it('should allow caregiver with accepted connection to read Patient', async () => {
      // Setup: Create Alice's Patient and Carol-Alice family connection (accepted)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();

        // Create Alice's Patient
        await setDoc(doc(db, 'patients', ALICE_PATIENT_ID), {
          resourceType: 'Patient',
          id: ALICE_PATIENT_ID,
          userId: ALICE_UID,
          active: true,
          name: [
            {
              use: 'official',
              text: 'Alice Nguyen',
              family: 'Nguyen',
              given: ['Alice'],
            },
          ],
          birthDate: '1990-05-15',
          gender: 'female',
          meta: {
            createdAt: Timestamp.now(),
            lastUpdated: Timestamp.now(),
          },
        });

        // Create accepted family connection (Carol -> Alice)
        const connectionId = `${CAROL_UID}_${ALICE_PATIENT_ID}`;
        await setDoc(doc(db, 'family_connections', connectionId), {
          patientUserId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          caregiverUserId: CAROL_UID,
          status: 'accepted',
          permissionLevel: 'view_only',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      // Test: Carol (caregiver) can read Alice's Patient
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const alicePatientRef = doc(carolDb, 'patients', ALICE_PATIENT_ID);

      await assertSucceeds(getDoc(alicePatientRef));
    });
  });

  describe('❌ TEST 6: Caregiver with pending connection cannot read Patient', () => {
    it('should deny caregiver with pending connection from reading Patient', async () => {
      // Setup: Create Alice's Patient and Carol-Alice family connection (pending)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();

        // Create Alice's Patient
        await setDoc(doc(db, 'patients', ALICE_PATIENT_ID), {
          resourceType: 'Patient',
          id: ALICE_PATIENT_ID,
          userId: ALICE_UID,
          active: true,
          name: [
            {
              use: 'official',
              text: 'Alice Nguyen',
              family: 'Nguyen',
              given: ['Alice'],
            },
          ],
          birthDate: '1990-05-15',
          gender: 'female',
          meta: {
            createdAt: Timestamp.now(),
            lastUpdated: Timestamp.now(),
          },
        });

        // Create pending family connection (Carol -> Alice)
        const connectionId = `${CAROL_UID}_${ALICE_PATIENT_ID}`;
        await setDoc(doc(db, 'family_connections', connectionId), {
          patientUserId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          caregiverUserId: CAROL_UID,
          status: 'pending',
          permissionLevel: 'view_only',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      // Test: Carol (caregiver) cannot read Alice's Patient (connection still pending)
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const alicePatientRef = doc(carolDb, 'patients', ALICE_PATIENT_ID);

      await assertFails(getDoc(alicePatientRef));
    });
  });

  describe('✅ TEST 7: Patient document validates FHIR resourceType = "Patient"', () => {
    it('should accept Patient document with valid FHIR resourceType', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const patientRef = doc(aliceDb, 'patients', ALICE_PATIENT_ID);

      const validPatientData = {
        resourceType: 'Patient', // ✅ Valid FHIR resourceType
        id: ALICE_PATIENT_ID,
        userId: ALICE_UID,
        active: true,
        name: [
          {
            use: 'official',
            text: 'Alice Nguyen',
            family: 'Nguyen',
            given: ['Alice'],
          },
        ],
        birthDate: '1990-05-15',
        gender: 'female',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(patientRef, validPatientData));
    });
  });

  describe('❌ TEST 8: Patient document with invalid resourceType rejected', () => {
    it('should reject Patient document with wrong resourceType', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const patientRef = doc(aliceDb, 'patients', ALICE_PATIENT_ID);

      const invalidPatientData = {
        resourceType: 'Person', // ❌ Invalid - should be "Patient"
        id: ALICE_PATIENT_ID,
        userId: ALICE_UID,
        active: true,
        name: [
          {
            use: 'official',
            text: 'Alice Nguyen',
            family: 'Nguyen',
            given: ['Alice'],
          },
        ],
        birthDate: '1990-05-15',
        gender: 'female',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(patientRef, invalidPatientData));
    });

    it('should reject Patient document missing resourceType', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const patientRef = doc(aliceDb, 'patients', ALICE_PATIENT_ID);

      const invalidPatientData = {
        // ❌ Missing resourceType
        id: ALICE_PATIENT_ID,
        userId: ALICE_UID,
        active: true,
        name: [
          {
            use: 'official',
            text: 'Alice Nguyen',
            family: 'Nguyen',
            given: ['Alice'],
          },
        ],
        birthDate: '1990-05-15',
        gender: 'female',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(patientRef, invalidPatientData));
    });

    it('should reject Patient document with missing name array', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const patientRef = doc(aliceDb, 'patients', ALICE_PATIENT_ID);

      const invalidPatientData = {
        resourceType: 'Patient',
        id: ALICE_PATIENT_ID,
        userId: ALICE_UID,
        active: true,
        // ❌ Missing name array (required by FHIR)
        birthDate: '1990-05-15',
        gender: 'female',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(patientRef, invalidPatientData));
    });

    it('should reject Patient document with wrong userId', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const patientRef = doc(aliceDb, 'patients', ALICE_PATIENT_ID);

      const invalidPatientData = {
        resourceType: 'Patient',
        id: ALICE_PATIENT_ID,
        userId: BOB_UID, // ❌ Wrong userId - doesn't match authenticated user
        active: true,
        name: [
          {
            use: 'official',
            text: 'Alice Nguyen',
            family: 'Nguyen',
            given: ['Alice'],
          },
        ],
        birthDate: '1990-05-15',
        gender: 'female',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(patientRef, invalidPatientData));
    });
  });
});
