/**
 * T008: Contract Test - Firestore Security Rules for MedicationAdministrations
 * 
 * Tests FHIR MedicationAdministration collection security rules to ensure:
 * - Patient can log own medication (status: completed)
 * - Caregiver with can_log permission can log for patient
 * - Caregiver with view_only permission cannot log
 * - Log edit allowed within 24-hour window
 * - Log edit blocked after 24-hour window
 * - MedicationAdministration validates status in FHIR value set
 * - MedicationAdministration validates effectiveDateTime <= now
 * - MedicationAdministration with future effectiveDateTime rejected
 * - Patient can read own MedicationAdministrations
 * - Caregiver can read MedicationAdministrations for monitored patient
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

describe('T008: Firestore Security Rules - MedicationAdministrations Collection', () => {
  let testEnv: RulesTestEnvironment;

  // Test user IDs
  const ALICE_UID = 'alice-user-id';
  const BOB_UID = 'bob-user-id';
  const CAROL_UID = 'carol-caregiver-id';

  // Test patient IDs
  const ALICE_PATIENT_ID = 'patient-alice-001';
  const BOB_PATIENT_ID = 'patient-bob-001';

  // Test IDs
  const ALICE_MED_REQ_1 = 'med-req-alice-001';
  const ALICE_MED_ADMIN_1 = 'med-admin-alice-001';
  const BOB_MED_ADMIN_1 = 'med-admin-bob-001';

  beforeAll(async () => {
    // Load Firestore security rules from the spec
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

  describe('✅ TEST 1: Patient can log own medication (status: completed)', () => {
    it('should allow patient to create MedicationAdministration with status completed', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medAdminRef = doc(aliceDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: Timestamp.now(),
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medAdminRef, medicationAdministrationData));
    });

    it('should allow patient to create MedicationAdministration with status not-done', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medAdminRef = doc(aliceDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'not-done',
        effectiveDateTime: Timestamp.now(),
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medAdminRef, medicationAdministrationData));
    });
  });

  describe('✅ TEST 2: Caregiver with can_log permission can log for patient', () => {
    it('should allow caregiver with can_log to create MedicationAdministration', async () => {
      // Setup: Create family connection (Carol is Alice's caregiver with can_log permission)
      const familyConnectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'accepted',
        permissionLevel: 'can_log',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'family_connections', `${CAROL_UID}_${ALICE_PATIENT_ID}`),
          familyConnectionData,
        );
      });

      // Test: Carol can create MedicationAdministration for Alice
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const medAdminRef = doc(carolDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: Timestamp.now(),
        performerUserId: CAROL_UID,
        performerRole: 'caregiver',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medAdminRef, medicationAdministrationData));
    });
  });

  describe('❌ TEST 3: Caregiver with view_only permission cannot log', () => {
    it('should deny caregiver with view_only from creating MedicationAdministration', async () => {
      // Setup: Create family connection (Carol is Alice's caregiver with view_only permission)
      const familyConnectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'accepted',
        permissionLevel: 'view_only',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'family_connections', `${CAROL_UID}_${ALICE_PATIENT_ID}`),
          familyConnectionData,
        );
      });

      // Test: Carol cannot create MedicationAdministration for Alice (view_only permission)
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const medAdminRef = doc(carolDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: Timestamp.now(),
        performerUserId: CAROL_UID,
        performerRole: 'caregiver',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medAdminRef, medicationAdministrationData));
    });
  });

  describe('✅ TEST 4: Log edit allowed within 24-hour window', () => {
    it('should allow patient to update MedicationAdministration within 24 hours', async () => {
      // Setup: Create MedicationAdministration (recent - within 24 hours)
      const recentTimestamp = Timestamp.now();
      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: recentTimestamp,
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        createdAt: recentTimestamp,
        meta: {
          createdAt: recentTimestamp,
          lastUpdated: recentTimestamp,
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_administrations', ALICE_MED_ADMIN_1),
          medicationAdministrationData,
        );
      });

      // Test: Alice can update her MedicationAdministration
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medAdminRef = doc(aliceDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const updatedData = {
        ...medicationAdministrationData,
        status: 'not-done',
        meta: {
          createdAt: recentTimestamp,
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medAdminRef, updatedData));
    });

    it('should allow caregiver to update MedicationAdministration they created within 24 hours', async () => {
      // Setup: Create family connection
      const familyConnectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'accepted',
        permissionLevel: 'can_log',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'family_connections', `${CAROL_UID}_${ALICE_PATIENT_ID}`),
          familyConnectionData,
        );
      });

      // Setup: Create MedicationAdministration by caregiver (recent)
      const recentTimestamp = Timestamp.now();
      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: recentTimestamp,
        performerUserId: CAROL_UID,
        performerRole: 'caregiver',
        createdAt: recentTimestamp,
        meta: {
          createdAt: recentTimestamp,
          lastUpdated: recentTimestamp,
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_administrations', ALICE_MED_ADMIN_1),
          medicationAdministrationData,
        );
      });

      // Test: Carol can update the MedicationAdministration she created
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const medAdminRef = doc(carolDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const updatedData = {
        ...medicationAdministrationData,
        status: 'not-done',
        meta: {
          createdAt: recentTimestamp,
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medAdminRef, updatedData));
    });
  });

  describe('❌ TEST 5: Log edit blocked after 24-hour window', () => {
    it('should deny patient from updating MedicationAdministration after 24 hours', async () => {
      // Setup: Create MedicationAdministration (old - 25 hours ago)
      const oldTimestamp = new Timestamp(
        Timestamp.now().seconds - 25 * 60 * 60, // 25 hours ago
        0,
      );
      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: oldTimestamp,
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        createdAt: oldTimestamp,
        meta: {
          createdAt: oldTimestamp,
          lastUpdated: oldTimestamp,
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_administrations', ALICE_MED_ADMIN_1),
          medicationAdministrationData,
        );
      });

      // Test: Alice cannot update old MedicationAdministration (>24 hours)
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medAdminRef = doc(aliceDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const updatedData = {
        ...medicationAdministrationData,
        status: 'not-done',
        meta: {
          createdAt: oldTimestamp,
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medAdminRef, updatedData));
    });
  });

  describe('✅ TEST 6: MedicationAdministration validates status in FHIR value set', () => {
    it('should accept MedicationAdministration with valid FHIR status', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();

      // Test all valid FHIR statuses
      const validStatuses = [
        'in-progress',
        'not-done',
        'on-hold',
        'completed',
        'entered-in-error',
        'stopped',
        'unknown',
      ];

      for (const status of validStatuses) {
        const medAdminRef = doc(
          aliceDb,
          'medication_administrations',
          `${ALICE_MED_ADMIN_1}-${status}`,
        );

        const medicationAdministrationData = {
          resourceType: 'MedicationAdministration',
          id: `${ALICE_MED_ADMIN_1}-${status}`,
          userId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          medicationRequestId: ALICE_MED_REQ_1,
          status: status,
          effectiveDateTime: Timestamp.now(),
          performerUserId: ALICE_UID,
          performerRole: 'patient',
          meta: {
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
          },
        };

        await assertSucceeds(setDoc(medAdminRef, medicationAdministrationData));
      }
    });

    it('should reject MedicationAdministration with invalid status', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medAdminRef = doc(aliceDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const invalidStatusData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'invalid-status',
        effectiveDateTime: Timestamp.now(),
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medAdminRef, invalidStatusData));
    });

    it('should reject MedicationAdministration with missing resourceType', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medAdminRef = doc(aliceDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const missingResourceTypeData = {
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: Timestamp.now(),
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medAdminRef, missingResourceTypeData));
    });

    it('should reject MedicationAdministration with missing medicationRequestId', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medAdminRef = doc(aliceDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const missingMedReqIdData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'completed',
        effectiveDateTime: Timestamp.now(),
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medAdminRef, missingMedReqIdData));
    });
  });

  describe('✅ TEST 7: MedicationAdministration validates effectiveDateTime <= now', () => {
    it('should accept MedicationAdministration with current effectiveDateTime', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medAdminRef = doc(aliceDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: Timestamp.now(),
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medAdminRef, medicationAdministrationData));
    });

    it('should accept MedicationAdministration with past effectiveDateTime', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medAdminRef = doc(aliceDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const pastTimestamp = new Timestamp(
        Timestamp.now().seconds - 2 * 60 * 60, // 2 hours ago
        0,
      );

      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: pastTimestamp,
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medAdminRef, medicationAdministrationData));
    });
  });

  describe('❌ TEST 8: MedicationAdministration with future effectiveDateTime rejected', () => {
    it('should reject MedicationAdministration with future effectiveDateTime', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medAdminRef = doc(aliceDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      const futureTimestamp = new Timestamp(
        Timestamp.now().seconds + 60 * 60, // 1 hour in future
        0,
      );

      const futureEffectiveData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: futureTimestamp,
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medAdminRef, futureEffectiveData));
    });
  });

  describe('✅ TEST 9: Patient can read own MedicationAdministrations', () => {
    it('should allow patient to read their own MedicationAdministration', async () => {
      // Setup: Create Alice's MedicationAdministration
      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: Timestamp.now(),
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_administrations', ALICE_MED_ADMIN_1),
          medicationAdministrationData,
        );
      });

      // Test: Alice can read her own MedicationAdministration
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medAdminRef = doc(aliceDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      await assertSucceeds(getDoc(medAdminRef));
    });

    it('should deny patient from reading other users\' MedicationAdministrations', async () => {
      // Setup: Create Bob's MedicationAdministration
      const bobMedicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: BOB_MED_ADMIN_1,
        userId: BOB_UID,
        patientId: BOB_PATIENT_ID,
        medicationRequestId: 'med-req-bob-001',
        status: 'completed',
        effectiveDateTime: Timestamp.now(),
        performerUserId: BOB_UID,
        performerRole: 'patient',
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_administrations', BOB_MED_ADMIN_1),
          bobMedicationAdministrationData,
        );
      });

      // Test: Alice cannot read Bob's MedicationAdministration
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const bobMedAdminRef = doc(aliceDb, 'medication_administrations', BOB_MED_ADMIN_1);

      await assertFails(getDoc(bobMedAdminRef));
    });
  });

  describe('✅ TEST 10: Caregiver can read MedicationAdministrations for monitored patient', () => {
    it('should allow caregiver with accepted connection to read patient MedicationAdministration', async () => {
      // Setup: Create family connection (Carol is Alice's caregiver with view_only permission)
      const familyConnectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'accepted',
        permissionLevel: 'view_only',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'family_connections', `${CAROL_UID}_${ALICE_PATIENT_ID}`),
          familyConnectionData,
        );
      });

      // Setup: Create Alice's MedicationAdministration
      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: Timestamp.now(),
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_administrations', ALICE_MED_ADMIN_1),
          medicationAdministrationData,
        );
      });

      // Test: Carol can read Alice's MedicationAdministration
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const medAdminRef = doc(carolDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      await assertSucceeds(getDoc(medAdminRef));
    });

    it('should deny caregiver without connection from reading MedicationAdministration', async () => {
      // Setup: Create Alice's MedicationAdministration (no family connection)
      const medicationAdministrationData = {
        resourceType: 'MedicationAdministration',
        id: ALICE_MED_ADMIN_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        medicationRequestId: ALICE_MED_REQ_1,
        status: 'completed',
        effectiveDateTime: Timestamp.now(),
        performerUserId: ALICE_UID,
        performerRole: 'patient',
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_administrations', ALICE_MED_ADMIN_1),
          medicationAdministrationData,
        );
      });

      // Test: Carol cannot read Alice's MedicationAdministration (no connection)
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const medAdminRef = doc(carolDb, 'medication_administrations', ALICE_MED_ADMIN_1);

      await assertFails(getDoc(medAdminRef));
    });
  });
});
