/**
 * T010: Contract Test - Firestore Indexes Validation
 * 
 * Verifies all composite indexes defined in firestore.indexes.json are deployed
 * and work correctly. Tests ensure that complex queries execute without
 * "index required" errors.
 * 
 * Index Categories:
 * - Patient queries: Filter by userId + active + sort by lastUpdated
 * - MedicationRequest queries: Filter by userId + patientId + status + sort
 * - MedicationAdministration queries: Filter by userId + medicationRequestId + sort
 * - FamilyConnection queries: Filter by userId + status + sort
 * - ReminderSchedule queries: Filter by userId + enabled + date ranges
 * 
 * @requires Firebase Emulator Suite running on localhost:8080
 * @requires firestore.indexes.json deployed to emulator
 */

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

describe('T010: Firestore Indexes Validation', () => {
  let testEnv: RulesTestEnvironment;

  const ALICE_UID = 'alice-user-id';
  const ALICE_PATIENT_ID = 'patient-alice-001';
  const ALICE_MED_REQ_1 = 'med-req-alice-001';
  const ALICE_MED_REQ_2 = 'med-req-alice-002';
  const CAROL_UID = 'carol-caregiver-id';

  beforeAll(async () => {
    // Load Firestore security rules (with permissive rules for testing indexes)
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

  describe('INDEX 1: Patients - (userId, active, meta.lastUpdated DESC)', () => {
    it('should query active patients by userId sorted by lastUpdated', async () => {
      // Setup: Create test patients
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();

        // Patient 1: Active, updated recently
        await setDoc(doc(firestore, 'patients', 'patient-001'), {
          resourceType: 'Patient',
          userId: ALICE_UID,
          active: true,
          name: [{ text: 'Alice Nguyen' }],
          meta: {
            lastUpdated: new Timestamp(Timestamp.now().seconds - 100, 0), // 100s ago
          },
        });

        // Patient 2: Active, updated more recently
        await setDoc(doc(firestore, 'patients', 'patient-002'), {
          resourceType: 'Patient',
          userId: ALICE_UID,
          active: true,
          name: [{ text: 'Emily Nguyen' }],
          meta: {
            lastUpdated: new Timestamp(Timestamp.now().seconds - 50, 0), // 50s ago
          },
        });

        // Patient 3: Inactive (should be filtered out)
        await setDoc(doc(firestore, 'patients', 'patient-003'), {
          resourceType: 'Patient',
          userId: ALICE_UID,
          active: false,
          name: [{ text: 'Old Profile' }],
          meta: {
            lastUpdated: new Timestamp(Timestamp.now().seconds - 200, 0),
          },
        });
      });

      // Test: Query active patients sorted by lastUpdated
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const patientsQuery = query(
        collection(aliceDb, 'patients'),
        where('userId', '==', ALICE_UID),
        where('active', '==', true),
        orderBy('meta.lastUpdated', 'desc'),
      );

      const snapshot = await getDocs(patientsQuery);
      
      expect(snapshot.size).toBe(2);
      const docs = snapshot.docs.map((doc) => doc.data());
      // Most recently updated should be first
      expect(docs[0].name[0].text).toBe('Emily Nguyen');
      expect(docs[1].name[0].text).toBe('Alice Nguyen');
    });
  });

  describe('INDEX 2: MedicationRequests - (userId, patientId, status, authoredOn DESC)', () => {
    it('should query medication requests by userId, patientId, status sorted by authoredOn', async () => {
      // Setup: Create test medication requests
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();

        // MedReq 1: Active, authored recently
        await setDoc(doc(firestore, 'medication_requests', 'med-req-001'), {
          resourceType: 'MedicationRequest',
          userId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          status: 'active',
          intent: 'order',
          medicationName: 'Lisinopril 10mg',
          dosageInstruction: [{}],
          authoredOn: new Timestamp(Timestamp.now().seconds - 100, 0),
        });

        // MedReq 2: Active, authored more recently
        await setDoc(doc(firestore, 'medication_requests', 'med-req-002'), {
          resourceType: 'MedicationRequest',
          userId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          status: 'active',
          intent: 'order',
          medicationName: 'Aspirin 81mg',
          dosageInstruction: [{}],
          authoredOn: new Timestamp(Timestamp.now().seconds - 50, 0),
        });

        // MedReq 3: Cancelled (different status)
        await setDoc(doc(firestore, 'medication_requests', 'med-req-003'), {
          resourceType: 'MedicationRequest',
          userId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          status: 'cancelled',
          intent: 'order',
          medicationName: 'Old Med',
          dosageInstruction: [{}],
          authoredOn: new Timestamp(Timestamp.now().seconds - 200, 0),
        });
      });

      // Test: Query active medication requests sorted by authoredOn
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const medReqQuery = query(
        collection(aliceDb, 'medication_requests'),
        where('userId', '==', ALICE_UID),
        where('patientId', '==', ALICE_PATIENT_ID),
        where('status', '==', 'active'),
        orderBy('authoredOn', 'desc'),
      );

      const snapshot = await getDocs(medReqQuery);
      
      expect(snapshot.size).toBe(2);
      const docs = snapshot.docs.map((doc) => doc.data());
      // Most recently authored should be first
      expect(docs[0].medicationName).toBe('Aspirin 81mg');
      expect(docs[1].medicationName).toBe('Lisinopril 10mg');
    });
  });

  describe('INDEX 3: MedicationAdministrations - (userId, medicationRequestId, effectiveDateTime DESC)', () => {
    it('should query medication logs by userId, medicationRequestId sorted by effectiveDateTime', async () => {
      // Setup: Create test medication administrations
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();

        // Log 1: Older
        await setDoc(doc(firestore, 'medication_administrations', 'log-001'), {
          resourceType: 'MedicationAdministration',
          userId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          medicationRequestId: ALICE_MED_REQ_1,
          status: 'completed',
          effectiveDateTime: new Timestamp(Timestamp.now().seconds - 7200, 0), // 2 hours ago
          performerUserId: ALICE_UID,
          performerRole: 'patient',
        });

        // Log 2: More recent
        await setDoc(doc(firestore, 'medication_administrations', 'log-002'), {
          resourceType: 'MedicationAdministration',
          userId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          medicationRequestId: ALICE_MED_REQ_1,
          status: 'completed',
          effectiveDateTime: new Timestamp(Timestamp.now().seconds - 3600, 0), // 1 hour ago
          performerUserId: ALICE_UID,
          performerRole: 'patient',
        });

        // Log 3: Different medication (should be filtered out)
        await setDoc(doc(firestore, 'medication_administrations', 'log-003'), {
          resourceType: 'MedicationAdministration',
          userId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          medicationRequestId: ALICE_MED_REQ_2,
          status: 'completed',
          effectiveDateTime: new Timestamp(Timestamp.now().seconds - 1800, 0),
          performerUserId: ALICE_UID,
          performerRole: 'patient',
        });
      });

      // Test: Query logs for specific medication sorted by effectiveDateTime
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const logsQuery = query(
        collection(aliceDb, 'medication_administrations'),
        where('userId', '==', ALICE_UID),
        where('medicationRequestId', '==', ALICE_MED_REQ_1),
        orderBy('effectiveDateTime', 'desc'),
      );

      const snapshot = await getDocs(logsQuery);
      
      expect(snapshot.size).toBe(2);
      const docs = snapshot.docs.map((doc) => doc.data());
      // Most recent log should be first
      expect(docs[0].effectiveDateTime.seconds).toBeGreaterThan(docs[1].effectiveDateTime.seconds);
    });
  });

  describe('INDEX 4: FamilyConnections - (patientUserId, status, updatedAt DESC)', () => {
    it('should query family connections by patientUserId, status sorted by updatedAt', async () => {
      // Setup: Create test family connections
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();

        // Connection 1: Accepted, updated recently
        await setDoc(doc(firestore, 'family_connections', 'conn-001'), {
          patientUserId: ALICE_UID,
          caregiverUserId: CAROL_UID,
          patientId: ALICE_PATIENT_ID,
          status: 'accepted',
          permissionLevel: 'can_log',
          createdAt: Timestamp.now(),
          updatedAt: new Timestamp(Timestamp.now().seconds - 100, 0),
        });

        // Connection 2: Accepted, updated more recently
        await setDoc(doc(firestore, 'family_connections', 'conn-002'), {
          patientUserId: ALICE_UID,
          caregiverUserId: 'another-caregiver',
          patientId: ALICE_PATIENT_ID,
          status: 'accepted',
          permissionLevel: 'view_only',
          createdAt: Timestamp.now(),
          updatedAt: new Timestamp(Timestamp.now().seconds - 50, 0),
        });

        // Connection 3: Pending (different status)
        await setDoc(doc(firestore, 'family_connections', 'conn-003'), {
          patientUserId: ALICE_UID,
          caregiverUserId: 'pending-caregiver',
          patientId: ALICE_PATIENT_ID,
          status: 'pending',
          permissionLevel: 'view_only',
          createdAt: Timestamp.now(),
          updatedAt: new Timestamp(Timestamp.now().seconds - 200, 0),
        });
      });

      // Test: Query accepted connections sorted by updatedAt
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const connectionsQuery = query(
        collection(aliceDb, 'family_connections'),
        where('patientUserId', '==', ALICE_UID),
        where('status', '==', 'accepted'),
        orderBy('updatedAt', 'desc'),
      );

      const snapshot = await getDocs(connectionsQuery);
      
      expect(snapshot.size).toBe(2);
      const docs = snapshot.docs.map((doc) => doc.data());
      // Most recently updated should be first
      expect(docs[0].caregiverUserId).toBe('another-caregiver');
      expect(docs[1].caregiverUserId).toBe(CAROL_UID);
    });
  });

  describe('INDEX 5: FamilyConnections - (caregiverUserId, status, updatedAt DESC)', () => {
    it('should query family connections by caregiverUserId, status sorted by updatedAt', async () => {
      // Setup: Create test family connections for caregiver view
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();

        // Connection 1: Carol caring for Alice
        await setDoc(doc(firestore, 'family_connections', 'conn-carol-alice'), {
          patientUserId: ALICE_UID,
          caregiverUserId: CAROL_UID,
          patientId: ALICE_PATIENT_ID,
          status: 'accepted',
          permissionLevel: 'can_log',
          createdAt: Timestamp.now(),
          updatedAt: new Timestamp(Timestamp.now().seconds - 100, 0),
        });

        // Connection 2: Carol caring for another patient
        await setDoc(doc(firestore, 'family_connections', 'conn-carol-bob'), {
          patientUserId: 'bob-user-id',
          caregiverUserId: CAROL_UID,
          patientId: 'patient-bob-001',
          status: 'accepted',
          permissionLevel: 'view_only',
          createdAt: Timestamp.now(),
          updatedAt: new Timestamp(Timestamp.now().seconds - 50, 0),
        });

        // Connection 3: Carol pending invitation
        await setDoc(doc(firestore, 'family_connections', 'conn-carol-pending'), {
          patientUserId: 'charlie-user-id',
          caregiverUserId: CAROL_UID,
          patientId: 'patient-charlie-001',
          status: 'pending',
          permissionLevel: 'view_only',
          createdAt: Timestamp.now(),
          updatedAt: new Timestamp(Timestamp.now().seconds - 200, 0),
        });
      });

      // Test: Query Carol's accepted connections sorted by updatedAt
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const connectionsQuery = query(
        collection(carolDb, 'family_connections'),
        where('caregiverUserId', '==', CAROL_UID),
        where('status', '==', 'accepted'),
        orderBy('updatedAt', 'desc'),
      );

      const snapshot = await getDocs(connectionsQuery);
      
      expect(snapshot.size).toBe(2);
      const docs = snapshot.docs.map((doc) => doc.data());
      // Most recently updated should be first
      expect(docs[0].patientUserId).toBe('bob-user-id');
      expect(docs[1].patientUserId).toBe(ALICE_UID);
    });
  });

  describe('INDEX 6: ReminderSchedules - (userId, isEnabled, effectiveDate)', () => {
    it('should query enabled reminder schedules by userId sorted by effectiveDate', async () => {
      // Setup: Create test reminder schedules
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();

        const today = Timestamp.now();
        const tomorrow = new Timestamp(today.seconds + 86400, 0);
        const dayAfter = new Timestamp(today.seconds + 172800, 0);

        // Schedule 1: Enabled, today
        await setDoc(doc(firestore, 'reminder_schedules', 'sched-001'), {
          userId: ALICE_UID,
          medicationRequestId: ALICE_MED_REQ_1,
          isEnabled: true,
          effectiveDate: today,
          instances: [],
        });

        // Schedule 2: Enabled, tomorrow
        await setDoc(doc(firestore, 'reminder_schedules', 'sched-002'), {
          userId: ALICE_UID,
          medicationRequestId: ALICE_MED_REQ_2,
          isEnabled: true,
          effectiveDate: tomorrow,
          instances: [],
        });

        // Schedule 3: Disabled (should be filtered out)
        await setDoc(doc(firestore, 'reminder_schedules', 'sched-003'), {
          userId: ALICE_UID,
          medicationRequestId: 'med-req-003',
          isEnabled: false,
          effectiveDate: dayAfter,
          instances: [],
        });
      });

      // Test: Query enabled schedules sorted by effectiveDate
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const schedulesQuery = query(
        collection(aliceDb, 'reminder_schedules'),
        where('userId', '==', ALICE_UID),
        where('isEnabled', '==', true),
        orderBy('effectiveDate', 'asc'),
      );

      const snapshot = await getDocs(schedulesQuery);
      
      expect(snapshot.size).toBe(2);
      const docs = snapshot.docs.map((doc) => doc.data());
      // Earlier date should be first
      expect(docs[0].medicationRequestId).toBe(ALICE_MED_REQ_1);
      expect(docs[1].medicationRequestId).toBe(ALICE_MED_REQ_2);
    });
  });

  describe('Additional Complex Queries', () => {
    it('should query medication administrations by patient, status, and time range', async () => {
      // Tests INDEX: (userId, patientId, status, effectiveDateTime DESC)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();

        const now = Timestamp.now();
        const yesterday = new Timestamp(now.seconds - 86400, 0);
        const twoDaysAgo = new Timestamp(now.seconds - 172800, 0);

        await setDoc(doc(firestore, 'medication_administrations', 'log-001'), {
          resourceType: 'MedicationAdministration',
          userId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          medicationRequestId: ALICE_MED_REQ_1,
          status: 'completed',
          effectiveDateTime: yesterday,
          performerUserId: ALICE_UID,
          performerRole: 'patient',
        });

        await setDoc(doc(firestore, 'medication_administrations', 'log-002'), {
          resourceType: 'MedicationAdministration',
          userId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          medicationRequestId: ALICE_MED_REQ_1,
          status: 'completed',
          effectiveDateTime: twoDaysAgo,
          performerUserId: ALICE_UID,
          performerRole: 'patient',
        });

        await setDoc(doc(firestore, 'medication_administrations', 'log-003'), {
          resourceType: 'MedicationAdministration',
          userId: ALICE_UID,
          patientId: ALICE_PATIENT_ID,
          medicationRequestId: ALICE_MED_REQ_1,
          status: 'not-done',
          effectiveDateTime: yesterday,
          performerUserId: ALICE_UID,
          performerRole: 'patient',
        });
      });

      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const logsQuery = query(
        collection(aliceDb, 'medication_administrations'),
        where('userId', '==', ALICE_UID),
        where('patientId', '==', ALICE_PATIENT_ID),
        where('status', '==', 'completed'),
        orderBy('effectiveDateTime', 'desc'),
      );

      const snapshot = await getDocs(logsQuery);
      expect(snapshot.size).toBe(2);
    });
  });
});
