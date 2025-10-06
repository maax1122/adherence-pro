/**
 * T007: Contract Test - Firestore Security Rules for MedicationRequests
 * 
 * Tests FHIR MedicationRequest collection security rules to ensure:
 * - Patient can create MedicationRequest for own patientId
 * - Patient can read own MedicationRequests
 * - Patient can update own MedicationRequests
 * - Patient can delete own MedicationRequests
 * - Unauthenticated user cannot access MedicationRequests
 * - User cannot read other users' MedicationRequests
 * - MedicationRequest must have valid FHIR fields (resourceType, status, intent)
 * - MedicationRequest with invalid status rejected
 * - Caregiver can read MedicationRequest for monitored patient
 * - Caregiver with can_log can create MedicationRequest for monitored patient
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
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

describe('T007: Firestore Security Rules - MedicationRequests Collection', () => {
  let testEnv: RulesTestEnvironment;

  // Test user IDs
  const ALICE_UID = 'alice-user-id';
  const BOB_UID = 'bob-user-id';
  const CAROL_UID = 'carol-caregiver-id';

  // Test patient IDs
  const ALICE_PATIENT_ID = 'patient-alice-001';
  const BOB_PATIENT_ID = 'patient-bob-001';

  // Test medication request IDs
  const ALICE_MED_REQ_1 = 'med-req-alice-001';
  const BOB_MED_REQ_1 = 'med-req-bob-001';

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

  describe('✅ TEST 1: Patient can create MedicationRequest for own patientId', () => {
    it('should allow patient to create MedicationRequest for themselves', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medReqRef = doc(aliceDb, 'medication_requests', ALICE_MED_REQ_1);

      const medicationRequestData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
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
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medReqRef, medicationRequestData));
    });
  });

  describe('✅ TEST 2: Patient can read own MedicationRequests', () => {
    it('should allow patient to read their own MedicationRequest', async () => {
      // Setup: Create Alice's MedicationRequest (with rules disabled)
      const medicationRequestData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
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
          },
        ],
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_requests', ALICE_MED_REQ_1),
          medicationRequestData,
        );
      });

      // Test: Alice can read her own MedicationRequest
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medReqRef = doc(aliceDb, 'medication_requests', ALICE_MED_REQ_1);

      await assertSucceeds(getDoc(medReqRef));
    });
  });

  describe('✅ TEST 3: Patient can update own MedicationRequests', () => {
    it('should allow patient to update their own MedicationRequest', async () => {
      // Setup: Create Alice's MedicationRequest (with rules disabled)
      const medicationRequestData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
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
          },
        ],
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_requests', ALICE_MED_REQ_1),
          medicationRequestData,
        );
      });

      // Test: Alice can update her MedicationRequest
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medReqRef = doc(aliceDb, 'medication_requests', ALICE_MED_REQ_1);

      const updatedData = {
        ...medicationRequestData,
        status: 'on-hold',
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medReqRef, updatedData));
    });
  });

  describe('✅ TEST 4: Patient can delete own MedicationRequests', () => {
    it('should allow patient to delete their own MedicationRequest', async () => {
      // Setup: Create Alice's MedicationRequest (with rules disabled)
      const medicationRequestData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
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
          },
        ],
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_requests', ALICE_MED_REQ_1),
          medicationRequestData,
        );
      });

      // Test: Alice can delete her MedicationRequest
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medReqRef = doc(aliceDb, 'medication_requests', ALICE_MED_REQ_1);

      await assertSucceeds(deleteDoc(medReqRef));
    });
  });

  describe('❌ TEST 5: Unauthenticated user cannot access MedicationRequests', () => {
    it('should deny unauthenticated user from reading MedicationRequest', async () => {
      // Setup: Create Alice's MedicationRequest (with rules disabled)
      const medicationRequestData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
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
          },
        ],
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_requests', ALICE_MED_REQ_1),
          medicationRequestData,
        );
      });

      // Test: Unauthenticated user cannot read
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const medReqRef = doc(unauthDb, 'medication_requests', ALICE_MED_REQ_1);

      await assertFails(getDoc(medReqRef));
    });

    it('should deny unauthenticated user from creating MedicationRequest', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const medReqRef = doc(unauthDb, 'medication_requests', ALICE_MED_REQ_1);

      const medicationRequestData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
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
          },
        ],
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medReqRef, medicationRequestData));
    });
  });

  describe('❌ TEST 6: User cannot read other users\' MedicationRequests', () => {
    it('should deny user from reading another user\'s MedicationRequest', async () => {
      // Setup: Create Bob's MedicationRequest (with rules disabled)
      const bobMedicationRequestData = {
        resourceType: 'MedicationRequest',
        id: BOB_MED_REQ_1,
        userId: BOB_UID,
        patientId: BOB_PATIENT_ID,
        status: 'active',
        intent: 'order',
        medicationName: 'Metformin 500mg',
        dosageInstruction: [
          {
            timing: {
              repeat: {
                frequency: 2,
                period: 1,
                periodUnit: 'day',
                timeOfDay: ['08:00', '20:00'],
              },
            },
          },
        ],
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_requests', BOB_MED_REQ_1),
          bobMedicationRequestData,
        );
      });

      // Test: Alice tries to read Bob's MedicationRequest
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const bobMedReqRef = doc(aliceDb, 'medication_requests', BOB_MED_REQ_1);

      await assertFails(getDoc(bobMedReqRef));
    });
  });

  describe('✅ TEST 7: MedicationRequest must have valid FHIR fields', () => {
    it('should accept MedicationRequest with all required FHIR fields', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medReqRef = doc(aliceDb, 'medication_requests', ALICE_MED_REQ_1);

      const validMedicationRequestData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'active',
        intent: 'order',
        medicationName: 'Aspirin 81mg',
        dosageInstruction: [
          {
            timing: {
              repeat: {
                frequency: 1,
                period: 1,
                periodUnit: 'day',
                timeOfDay: ['09:00'],
              },
            },
            doseAndRate: [
              {
                doseQuantity: {
                  value: 81,
                  unit: 'mg',
                },
              },
            ],
          },
        ],
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medReqRef, validMedicationRequestData));
    });
  });

  describe('❌ TEST 8: MedicationRequest with invalid status rejected', () => {
    it('should reject MedicationRequest with invalid status value', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medReqRef = doc(aliceDb, 'medication_requests', ALICE_MED_REQ_1);

      const invalidStatusData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'invalid-status', // Invalid status
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
          },
        ],
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medReqRef, invalidStatusData));
    });

    it('should reject MedicationRequest with missing resourceType', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medReqRef = doc(aliceDb, 'medication_requests', ALICE_MED_REQ_1);

      const missingResourceTypeData = {
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
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
          },
        ],
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medReqRef, missingResourceTypeData));
    });

    it('should reject MedicationRequest with empty medicationName', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medReqRef = doc(aliceDb, 'medication_requests', ALICE_MED_REQ_1);

      const emptyMedicationNameData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'active',
        intent: 'order',
        medicationName: '', // Empty medication name
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
          },
        ],
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medReqRef, emptyMedicationNameData));
    });

    it('should reject MedicationRequest with empty dosageInstruction', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medReqRef = doc(aliceDb, 'medication_requests', ALICE_MED_REQ_1);

      const emptyDosageData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'active',
        intent: 'order',
        medicationName: 'Lisinopril 10mg',
        dosageInstruction: [], // Empty array
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medReqRef, emptyDosageData));
    });
  });

  describe('✅ TEST 9: Caregiver can read MedicationRequest for monitored patient', () => {
    it('should allow caregiver with accepted connection to read patient MedicationRequest', async () => {
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

      // Setup: Create Alice's MedicationRequest
      const medicationRequestData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
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
          },
        ],
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_requests', ALICE_MED_REQ_1),
          medicationRequestData,
        );
      });

      // Test: Carol can read Alice's MedicationRequest
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const medReqRef = doc(carolDb, 'medication_requests', ALICE_MED_REQ_1);

      await assertSucceeds(getDoc(medReqRef));
    });
  });

  describe('✅ TEST 10: Caregiver with can_log can create MedicationRequest', () => {
    it('should allow caregiver with can_log permission to create MedicationRequest', async () => {
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

      // Test: Carol can create MedicationRequest for Alice
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const medReqRef = doc(carolDb, 'medication_requests', ALICE_MED_REQ_1);

      const medicationRequestData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
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
          },
        ],
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medReqRef, medicationRequestData));
    });

    it('should allow caregiver with can_log permission to update MedicationRequest', async () => {
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

      // Setup: Create Alice's MedicationRequest
      const medicationRequestData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
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
          },
        ],
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
        },
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'medication_requests', ALICE_MED_REQ_1),
          medicationRequestData,
        );
      });

      // Test: Carol can update Alice's MedicationRequest
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const medReqRef = doc(carolDb, 'medication_requests', ALICE_MED_REQ_1);

      const updatedData = {
        ...medicationRequestData,
        status: 'on-hold',
        meta: {
          createdAt: Timestamp.now(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertSucceeds(setDoc(medReqRef, updatedData));
    });

    it('should deny caregiver with view_only permission from creating MedicationRequest', async () => {
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

      // Test: Carol cannot create MedicationRequest for Alice (view_only permission)
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const medReqRef = doc(carolDb, 'medication_requests', ALICE_MED_REQ_1);

      const medicationRequestData = {
        resourceType: 'MedicationRequest',
        id: ALICE_MED_REQ_1,
        userId: ALICE_UID,
        patientId: ALICE_PATIENT_ID,
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
          },
        ],
        meta: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
      };

      await assertFails(setDoc(medReqRef, medicationRequestData));
    });
  });
});
