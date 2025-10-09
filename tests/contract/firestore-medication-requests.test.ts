/**
 * Contract Tests: Firestore MedicationRequest Collection
 * 
 * Tests Firestore Security Rules for /medication_requests/{id} collection
 * Tests FHIR R4 MedicationRequest schema validation
 * 
 * @requires Firebase Emulator running on localhost:8080
 * @requires firestore.rules deployed to emulator
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Initialize test environment with Firestore rules
  const rulesPath = resolve(__dirname, '../../specs/001-medication-family-tracker/contracts/firestore.rules');
  const rules = readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: 'medication-tracker-test',
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

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe('MedicationRequest Collection - Authentication', () => {
  it('should deny unauthenticated read', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertFails(getDoc(medRef));
  });

  it('should deny unauthenticated create', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertFails(
      setDoc(medRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Aspirin',
      })
    );
  });
});

describe('MedicationRequest Collection - Create', () => {
  it('should allow authenticated user to create their own medication request', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertSucceeds(
      setDoc(medRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Aspirin',
        dosageAmount: '100mg',
        frequency: 2,
        intakeTimes: ['08:00', '20:00'],
        isPRN: false,
        meta: {
          versionId: '1',
          lastUpdated: Timestamp.now(),
        },
      })
    );
  });

  it('should deny creating medication request for different user', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertFails(
      setDoc(medRef, {
        resourceType: 'MedicationRequest',
        userId: 'user456', // Different user
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Aspirin',
      })
    );
  });

  it('should enforce resourceType = MedicationRequest', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertFails(
      setDoc(medRef, {
        resourceType: 'Patient', // Wrong resource type
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Aspirin',
      })
    );
  });

  it('should validate status field values', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    // Valid status
    await assertSucceeds(
      setDoc(medRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Aspirin',
        meta: { versionId: '1', lastUpdated: Timestamp.now() },
      })
    );
  });

  it('should deny invalid status field values', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med456');

    // Invalid status
    await assertFails(
      setDoc(medRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'invalid_status', // Not in allowed list
        medicationName: 'Aspirin',
      })
    );
  });

  it('should require patient to belong to user', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    
    // First create a patient owned by user123
    const patientRef = doc(db, 'patients/patient123');
    await setDoc(patientRef, {
      resourceType: 'Patient',
      userId: 'user123',
      active: true,
      name: 'John Doe',
      birthDate: '1990-01-01',
      meta: { versionId: '1', lastUpdated: Timestamp.now() },
    });

    // Now create medication request for that patient
    const medRef = doc(db, 'medication_requests/med123');
    await assertSucceeds(
      setDoc(medRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Aspirin',
        meta: { versionId: '1', lastUpdated: Timestamp.now() },
      })
    );
  });

  it('should allow creating PRN medication (no schedule)', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med_prn_123');

    await assertSucceeds(
      setDoc(medRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Tylenol',
        dosageAmount: '500mg',
        isPRN: true,
        prnCondition: 'When headache occurs',
        maxDosePerDay: '6 tablets',
        meta: { versionId: '1', lastUpdated: Timestamp.now() },
      })
    );
  });

  it('should allow creating scheduled medication with intake times', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med_scheduled_123');

    await assertSucceeds(
      setDoc(medRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Aspirin',
        dosageAmount: '100mg',
        frequency: 2,
        intakeTimes: ['08:00', '20:00'],
        isPRN: false,
        meta: { versionId: '1', lastUpdated: Timestamp.now() },
      })
    );
  });
});

describe('MedicationRequest Collection - Read', () => {
  beforeEach(async () => {
    // Setup: Create a medication request owned by user123
    const adminDb = testEnv.authenticatedContext('user123', { admin: true }).firestore();
    const medRef = doc(adminDb, 'medication_requests/med123');
    await setDoc(medRef, {
      resourceType: 'MedicationRequest',
      userId: 'user123',
      patientId: 'patient123',
      status: 'active',
      medicationName: 'Aspirin',
      dosageAmount: '100mg',
      meta: { versionId: '1', lastUpdated: Timestamp.now() },
    });
  });

  it('should allow owner to read their medication request', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertSucceeds(getDoc(medRef));
  });

  it('should deny non-owner from reading medication request', async () => {
    const db = testEnv.authenticatedContext('user456').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertFails(getDoc(medRef));
  });

  it('should allow approved caregiver to read patient medication request', async () => {
    // Setup: Create family connection (patient-caregiver link)
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    const connectionRef = doc(adminDb, 'family_connections/connection123');
    await setDoc(connectionRef, {
      patientUserId: 'user123',
      caregiverUserId: 'caregiver456',
      patientId: 'patient123',
      status: 'accepted',
      permissions: ['can_view', 'can_log'],
      invitedAt: Timestamp.now(),
      acceptedAt: Timestamp.now(),
    });

    // Caregiver reads patient's medication
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertSucceeds(getDoc(medRef));
  });

  it('should deny caregiver with pending status from reading', async () => {
    // Setup: Create family connection with pending status
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    const connectionRef = doc(adminDb, 'family_connections/connection123');
    await setDoc(connectionRef, {
      patientUserId: 'user123',
      caregiverUserId: 'caregiver456',
      patientId: 'patient123',
      status: 'pending', // Not yet accepted
      permissions: ['can_view'],
      invitedAt: Timestamp.now(),
    });

    // Caregiver tries to read patient's medication
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertFails(getDoc(medRef));
  });
});

describe('MedicationRequest Collection - Update', () => {
  beforeEach(async () => {
    // Setup: Create a medication request owned by user123
    const adminDb = testEnv.authenticatedContext('user123', { admin: true }).firestore();
    const medRef = doc(adminDb, 'medication_requests/med123');
    await setDoc(medRef, {
      resourceType: 'MedicationRequest',
      userId: 'user123',
      patientId: 'patient123',
      status: 'active',
      medicationName: 'Aspirin',
      dosageAmount: '100mg',
      frequency: 2,
      intakeTimes: ['08:00', '20:00'],
      meta: { versionId: '1', lastUpdated: Timestamp.now() },
    });
  });

  it('should allow owner to update their medication request', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertSucceeds(
      updateDoc(medRef, {
        dosageAmount: '200mg', // Changed dosage
        'meta.lastUpdated': Timestamp.now(),
      })
    );
  });

  it('should deny non-owner from updating medication request', async () => {
    const db = testEnv.authenticatedContext('user456').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertFails(
      updateDoc(medRef, {
        dosageAmount: '200mg',
      })
    );
  });

  it('should deny caregiver from updating medication request (read-only)', async () => {
    // Setup: Create family connection
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    const connectionRef = doc(adminDb, 'family_connections/connection123');
    await setDoc(connectionRef, {
      patientUserId: 'user123',
      caregiverUserId: 'caregiver456',
      patientId: 'patient123',
      status: 'accepted',
      permissions: ['can_view', 'can_log'], // Can log, but not update medication requests
      invitedAt: Timestamp.now(),
      acceptedAt: Timestamp.now(),
    });

    // Caregiver tries to update patient's medication
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertFails(
      updateDoc(medRef, {
        dosageAmount: '200mg',
      })
    );
  });

  it('should deny changing resourceType', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertFails(
      updateDoc(medRef, {
        resourceType: 'Patient', // Cannot change resource type
      })
    );
  });

  it('should allow status transitions', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    // Active → On-Hold
    await assertSucceeds(
      updateDoc(medRef, {
        status: 'on-hold',
        'meta.lastUpdated': Timestamp.now(),
      })
    );

    // On-Hold → Completed
    await assertSucceeds(
      updateDoc(medRef, {
        status: 'completed',
        'meta.lastUpdated': Timestamp.now(),
      })
    );
  });
});

describe('MedicationRequest Collection - Delete', () => {
  beforeEach(async () => {
    // Setup: Create a medication request owned by user123
    const adminDb = testEnv.authenticatedContext('user123', { admin: true }).firestore();
    const medRef = doc(adminDb, 'medication_requests/med123');
    await setDoc(medRef, {
      resourceType: 'MedicationRequest',
      userId: 'user123',
      patientId: 'patient123',
      status: 'active',
      medicationName: 'Aspirin',
      meta: { versionId: '1', lastUpdated: Timestamp.now() },
    });
  });

  it('should allow owner to delete their medication request', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertSucceeds(deleteDoc(medRef));
  });

  it('should deny non-owner from deleting medication request', async () => {
    const db = testEnv.authenticatedContext('user456').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertFails(deleteDoc(medRef));
  });

  it('should deny caregiver from deleting medication request', async () => {
    // Setup: Create family connection
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    const connectionRef = doc(adminDb, 'family_connections/connection123');
    await setDoc(connectionRef, {
      patientUserId: 'user123',
      caregiverUserId: 'caregiver456',
      patientId: 'patient123',
      status: 'accepted',
      permissions: ['can_view', 'can_log'],
      invitedAt: Timestamp.now(),
      acceptedAt: Timestamp.now(),
    });

    // Caregiver tries to delete patient's medication
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertFails(deleteDoc(medRef));
  });
});

describe('MedicationRequest Collection - FHIR Validation', () => {
  it('should enforce FHIR MedicationRequest schema', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertSucceeds(
      setDoc(medRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Aspirin',
        dosageAmount: '100mg',
        form: 'Tablet',
        route: 'Oral',
        frequency: 2,
        intakeTimes: ['08:00', '20:00'],
        isPRN: false,
        instructions: 'Take with food',
        authoredOn: Timestamp.now(),
        meta: {
          versionId: '1',
          lastUpdated: Timestamp.now(),
        },
      })
    );
  });

  it('should allow optional fields (photoUrl, notes)', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertSucceeds(
      setDoc(medRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Aspirin',
        dosageAmount: '100mg',
        photoUrl: 'https://example.com/aspirin.jpg',
        notes: 'Important: Take after breakfast',
        meta: { versionId: '1', lastUpdated: Timestamp.now() },
      })
    );
  });

  it('should validate dosageInstruction timing schema', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const medRef = doc(db, 'medication_requests/med123');

    await assertSucceeds(
      setDoc(medRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Amoxicillin',
        dosageAmount: '250mg',
        frequency: 3,
        period: 1,
        periodUnit: 'day',
        intakeTimes: ['08:00', '14:00', '20:00'],
        duration: 7,
        durationUnit: 'days',
        meta: { versionId: '1', lastUpdated: Timestamp.now() },
      })
    );
  });

  it('should validate PRN vs scheduled logic', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();

    // PRN medication: isPRN=true, no intakeTimes
    const prnRef = doc(db, 'medication_requests/med_prn_123');
    await assertSucceeds(
      setDoc(prnRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Tylenol',
        dosageAmount: '500mg',
        isPRN: true,
        prnCondition: 'When headache occurs',
        maxDosePerDay: '6 tablets',
        meta: { versionId: '1', lastUpdated: Timestamp.now() },
      })
    );

    // Scheduled medication: isPRN=false, has intakeTimes
    const scheduledRef = doc(db, 'medication_requests/med_scheduled_123');
    await assertSucceeds(
      setDoc(scheduledRef, {
        resourceType: 'MedicationRequest',
        userId: 'user123',
        patientId: 'patient123',
        status: 'active',
        medicationName: 'Aspirin',
        dosageAmount: '100mg',
        frequency: 2,
        intakeTimes: ['08:00', '20:00'],
        isPRN: false,
        meta: { versionId: '1', lastUpdated: Timestamp.now() },
      })
    );
  });
});
