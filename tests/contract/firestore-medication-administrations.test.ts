/**
 * Contract Tests: Firestore MedicationAdministration Collection
 * 
 * Tests Firestore Security Rules for /medication_administrations/{id} collection
 * Tests FHIR R4 MedicationAdministration schema validation
 * Tests 24-hour edit window enforcement
 * Tests caregiver logging on behalf of patient
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

describe('MedicationAdministration Collection - Authentication', () => {
  it('should deny unauthenticated read', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertFails(getDoc(adminRef));
  });

  it('should deny unauthenticated create', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertFails(
      setDoc(adminRef, {
        resourceType: 'MedicationAdministration',
        userId: 'user123',
        patientId: 'patient123',
        medicationRequestId: 'med123',
        status: 'completed',
        administrationStatus: 'taken',
      })
    );
  });
});

describe('MedicationAdministration Collection - Create', () => {
  it('should allow patient to log their own medication intake', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertSucceeds(
      setDoc(adminRef, {
        resourceType: 'MedicationAdministration',
        userId: 'user123',
        patientId: 'patient123',
        medicationRequestId: 'med123',
        status: 'completed',
        administrationStatus: 'taken',
        actualTime: Timestamp.now(),
        scheduledTime: Timestamp.now(),
        performedBy: 'user123',
        performedByRole: 'patient',
        meta: {
          versionId: '1',
          lastUpdated: Timestamp.now(),
        },
      })
    );
  });

  it('should deny logging for different user', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertFails(
      setDoc(adminRef, {
        resourceType: 'MedicationAdministration',
        userId: 'user456', // Different user
        patientId: 'patient123',
        medicationRequestId: 'med123',
        status: 'completed',
        administrationStatus: 'taken',
      })
    );
  });

  it('should enforce resourceType = MedicationAdministration', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertFails(
      setDoc(adminRef, {
        resourceType: 'Patient', // Wrong resource type
        userId: 'user123',
        patientId: 'patient123',
        medicationRequestId: 'med123',
        status: 'completed',
      })
    );
  });

  it('should validate status field values', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    
    // Valid statuses
    const statuses = ['completed', 'not-done', 'in-progress'];
    
    for (const status of statuses) {
      const adminRef = doc(db, `medication_administrations/admin_${status}`);
      await assertSucceeds(
        setDoc(adminRef, {
          resourceType: 'MedicationAdministration',
          userId: 'user123',
          patientId: 'patient123',
          medicationRequestId: 'med123',
          status,
          administrationStatus: 'taken',
          meta: { versionId: '1', lastUpdated: Timestamp.now() },
        })
      );
    }
  });

  it('should validate administrationStatus field values', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    
    // Valid administration statuses
    const statuses = ['taken', 'taken_late', 'missed', 'skipped'];
    
    for (const administrationStatus of statuses) {
      const adminRef = doc(db, `medication_administrations/admin_${administrationStatus}`);
      await assertSucceeds(
        setDoc(adminRef, {
          resourceType: 'MedicationAdministration',
          userId: 'user123',
          patientId: 'patient123',
          medicationRequestId: 'med123',
          status: 'completed',
          administrationStatus,
          meta: { versionId: '1', lastUpdated: Timestamp.now() },
        })
      );
    }
  });

  it('should allow caregiver to log on behalf of patient', async () => {
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

    // Caregiver logs medication for patient
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertSucceeds(
      setDoc(adminRef, {
        resourceType: 'MedicationAdministration',
        userId: 'user123', // Patient's userId
        patientId: 'patient123',
        medicationRequestId: 'med123',
        status: 'completed',
        administrationStatus: 'taken',
        actualTime: Timestamp.now(),
        performedBy: 'caregiver456', // Caregiver's userId
        performedByRole: 'caregiver',
        performedByName: 'Jane Smith',
        meta: { versionId: '1', lastUpdated: Timestamp.now() },
      })
    );
  });

  it('should deny caregiver without can_log permission', async () => {
    // Setup: Create family connection without can_log permission
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    const connectionRef = doc(adminDb, 'family_connections/connection123');
    await setDoc(connectionRef, {
      patientUserId: 'user123',
      caregiverUserId: 'caregiver456',
      patientId: 'patient123',
      status: 'accepted',
      permissions: ['can_view'], // No can_log permission
      invitedAt: Timestamp.now(),
      acceptedAt: Timestamp.now(),
    });

    // Caregiver tries to log medication for patient
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertFails(
      setDoc(adminRef, {
        resourceType: 'MedicationAdministration',
        userId: 'user123',
        patientId: 'patient123',
        medicationRequestId: 'med123',
        status: 'completed',
        administrationStatus: 'taken',
      })
    );
  });
});

describe('MedicationAdministration Collection - Read', () => {
  beforeEach(async () => {
    // Setup: Create a medication administration owned by user123
    const adminDb = testEnv.authenticatedContext('user123', { admin: true }).firestore();
    const adminRef = doc(adminDb, 'medication_administrations/admin123');
    await setDoc(adminRef, {
      resourceType: 'MedicationAdministration',
      userId: 'user123',
      patientId: 'patient123',
      medicationRequestId: 'med123',
      status: 'completed',
      administrationStatus: 'taken',
      actualTime: Timestamp.now(),
      meta: { versionId: '1', lastUpdated: Timestamp.now() },
    });
  });

  it('should allow patient to read their own medication log', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertSucceeds(getDoc(adminRef));
  });

  it('should deny non-owner from reading medication log', async () => {
    const db = testEnv.authenticatedContext('user456').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertFails(getDoc(adminRef));
  });

  it('should allow approved caregiver to read patient medication log', async () => {
    // Setup: Create family connection
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    const connectionRef = doc(adminDb, 'family_connections/connection123');
    await setDoc(connectionRef, {
      patientUserId: 'user123',
      caregiverUserId: 'caregiver456',
      patientId: 'patient123',
      status: 'accepted',
      permissions: ['can_view'],
      invitedAt: Timestamp.now(),
      acceptedAt: Timestamp.now(),
    });

    // Caregiver reads patient's medication log
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertSucceeds(getDoc(adminRef));
  });
});

describe('MedicationAdministration Collection - Update (24-Hour Edit Window)', () => {
  it('should allow update within 24 hours', async () => {
    // Setup: Create a medication log 1 hour ago
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const db = testEnv.authenticatedContext('user123').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');
    
    await setDoc(adminRef, {
      resourceType: 'MedicationAdministration',
      userId: 'user123',
      patientId: 'patient123',
      medicationRequestId: 'med123',
      status: 'completed',
      administrationStatus: 'taken',
      actualTime: Timestamp.fromDate(oneHourAgo),
      meta: {
        versionId: '1',
        lastUpdated: Timestamp.fromDate(oneHourAgo),
      },
    });

    // Update within 24 hours
    await assertSucceeds(
      updateDoc(adminRef, {
        administrationStatus: 'taken_late',
        notes: 'Actually took it late',
        'meta.lastUpdated': Timestamp.now(),
      })
    );
  });

  it('should deny update after 24 hours', async () => {
    // Setup: Create a medication log 25 hours ago
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const adminDb = testEnv.authenticatedContext('user123', { admin: true }).firestore();
    const adminRef = doc(adminDb, 'medication_administrations/admin123');
    
    await setDoc(adminRef, {
      resourceType: 'MedicationAdministration',
      userId: 'user123',
      patientId: 'patient123',
      medicationRequestId: 'med123',
      status: 'completed',
      administrationStatus: 'taken',
      actualTime: Timestamp.fromDate(twentyFiveHoursAgo),
      meta: {
        versionId: '1',
        lastUpdated: Timestamp.fromDate(twentyFiveHoursAgo),
      },
    });

    // Attempt to update after 24 hours
    const db = testEnv.authenticatedContext('user123').firestore();
    await assertFails(
      updateDoc(adminRef, {
        administrationStatus: 'taken_late',
      })
    );
  });

  it('should deny caregiver from updating medication log', async () => {
    // Setup: Create medication log
    const adminDb = testEnv.authenticatedContext('user123', { admin: true }).firestore();
    const adminRef = doc(adminDb, 'medication_administrations/admin123');
    await setDoc(adminRef, {
      resourceType: 'MedicationAdministration',
      userId: 'user123',
      patientId: 'patient123',
      medicationRequestId: 'med123',
      status: 'completed',
      administrationStatus: 'taken',
      actualTime: Timestamp.now(),
      meta: { versionId: '1', lastUpdated: Timestamp.now() },
    });

    // Setup: Create family connection
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

    // Caregiver tries to update patient's medication log
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    await assertFails(
      updateDoc(adminRef, {
        administrationStatus: 'taken_late',
      })
    );
  });

  it('should deny changing critical fields (userId, patientId)', async () => {
    // Setup: Create medication log
    const db = testEnv.authenticatedContext('user123').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');
    await setDoc(adminRef, {
      resourceType: 'MedicationAdministration',
      userId: 'user123',
      patientId: 'patient123',
      medicationRequestId: 'med123',
      status: 'completed',
      administrationStatus: 'taken',
      actualTime: Timestamp.now(),
      meta: { versionId: '1', lastUpdated: Timestamp.now() },
    });

    // Try to change userId
    await assertFails(
      updateDoc(adminRef, {
        userId: 'user456',
      })
    );

    // Try to change patientId
    await assertFails(
      updateDoc(adminRef, {
        patientId: 'patient456',
      })
    );
  });
});

describe('MedicationAdministration Collection - Delete', () => {
  beforeEach(async () => {
    // Setup: Create a medication log owned by user123
    const adminDb = testEnv.authenticatedContext('user123', { admin: true }).firestore();
    const adminRef = doc(adminDb, 'medication_administrations/admin123');
    await setDoc(adminRef, {
      resourceType: 'MedicationAdministration',
      userId: 'user123',
      patientId: 'patient123',
      medicationRequestId: 'med123',
      status: 'completed',
      administrationStatus: 'taken',
      meta: { versionId: '1', lastUpdated: Timestamp.now() },
    });
  });

  it('should deny deletes (soft delete only via status change)', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    // Direct delete should fail
    await assertFails(deleteDoc(adminRef));
  });

  it('should allow soft delete via status change', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    // Soft delete via status change
    await assertSucceeds(
      updateDoc(adminRef, {
        status: 'not-done',
        administrationStatus: 'cancelled',
        'meta.lastUpdated': Timestamp.now(),
      })
    );
  });

  it('should deny caregiver from deleting medication log', async () => {
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

    // Caregiver tries to delete patient's medication log
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertFails(deleteDoc(adminRef));
  });
});

describe('MedicationAdministration Collection - FHIR Validation', () => {
  it('should enforce FHIR MedicationAdministration schema', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertSucceeds(
      setDoc(adminRef, {
        resourceType: 'MedicationAdministration',
        userId: 'user123',
        patientId: 'patient123',
        medicationRequestId: 'med123',
        status: 'completed',
        administrationStatus: 'taken',
        actualTime: Timestamp.now(),
        scheduledTime: Timestamp.now(),
        effectiveDateTime: Timestamp.now(),
        performedBy: 'user123',
        performedByRole: 'patient',
        performedByName: 'John Doe',
        dosageText: '100mg tablet',
        notes: 'Took with breakfast',
        meta: {
          versionId: '1',
          lastUpdated: Timestamp.now(),
        },
      })
    );
  });

  it('should allow optional fields', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertSucceeds(
      setDoc(adminRef, {
        resourceType: 'MedicationAdministration',
        userId: 'user123',
        patientId: 'patient123',
        medicationRequestId: 'med123',
        status: 'completed',
        administrationStatus: 'taken',
        actualTime: Timestamp.now(),
        // Optional fields omitted
        meta: { versionId: '1', lastUpdated: Timestamp.now() },
      })
    );
  });

  it('should validate performer fields for caregiver logs', async () => {
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

    // Caregiver logs with performer fields
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const adminRef = doc(db, 'medication_administrations/admin123');

    await assertSucceeds(
      setDoc(adminRef, {
        resourceType: 'MedicationAdministration',
        userId: 'user123', // Patient's userId
        patientId: 'patient123',
        medicationRequestId: 'med123',
        status: 'completed',
        administrationStatus: 'taken',
        actualTime: Timestamp.now(),
        performedBy: 'caregiver456', // Caregiver's userId
        performedByRole: 'caregiver',
        performedByName: 'Jane Smith',
        notes: 'Patient forgot, took at 8:30 AM',
        meta: { versionId: '1', lastUpdated: Timestamp.now() },
      })
    );
  });
});
