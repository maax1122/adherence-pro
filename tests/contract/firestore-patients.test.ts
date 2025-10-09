/**
 * Contract Tests: Firestore Patients Collection
 * 
 * These tests validate Firestore Security Rules for the /patients collection.
 * Tests MUST fail initially (TDD) until security rules are deployed.
 * 
 * Run with Firebase Emulator:
 * - firebase emulators:start --only firestore
 * - npm run test:contract
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Load security rules from firestore.rules
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

describe('Patient Collection - Authentication', () => {
  it('should deny unauthenticated read', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const patientRef = doc(unauthedDb, 'patients/patient123');
    
    await assertFails(getDoc(patientRef));
  });

  it('should deny unauthenticated create', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const patientRef = doc(unauthedDb, 'patients/patient123');
    
    await assertFails(
      setDoc(patientRef, {
        resourceType: 'Patient',
        userId: 'user123',
        active: true,
        name: 'John Doe',
      })
    );
  });
});

describe('Patient Collection - Create', () => {
  it('should allow authenticated user to create their own patient', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    await assertSucceeds(
      setDoc(patientRef, {
        resourceType: 'Patient',
        userId: 'user123',
        active: true,
        name: 'John Doe',
        birthDate: '1990-01-01',
        photoUrl: null,
        role: 'self',
        meta: {
          versionId: '1',
          lastUpdated: Timestamp.now(),
        },
      })
    );
  });

  it('should deny creating patient with different userId', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const patientRef = doc(db, 'patients/patient456');
    
    await assertFails(
      setDoc(patientRef, {
        resourceType: 'Patient',
        userId: 'user456', // Different user!
        active: true,
        name: 'Jane Doe',
      })
    );
  });

  it('should deny creating patient without resourceType', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    await assertFails(
      setDoc(patientRef, {
        // resourceType missing!
        userId: 'user123',
        active: true,
        name: 'John Doe',
      })
    );
  });

  it('should deny creating patient with wrong resourceType', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    await assertFails(
      setDoc(patientRef, {
        resourceType: 'MedicationRequest', // Wrong resource type!
        userId: 'user123',
        active: true,
        name: 'John Doe',
      })
    );
  });

  it('should deny creating inactive patient', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    await assertFails(
      setDoc(patientRef, {
        resourceType: 'Patient',
        userId: 'user123',
        active: false, // Must be active on creation
        name: 'John Doe',
      })
    );
  });
});

describe('Patient Collection - Read', () => {
  beforeEach(async () => {
    // Setup: Create patient owned by user123
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    await setDoc(doc(adminDb, 'patients/patient123'), {
      resourceType: 'Patient',
      userId: 'user123',
      active: true,
      name: 'John Doe',
      meta: {
        versionId: '1',
        lastUpdated: Timestamp.now(),
      },
    });
  });

  it('should allow owner to read their own patient', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    await assertSucceeds(getDoc(patientRef));
  });

  it('should deny non-owner from reading patient', async () => {
    const db = testEnv.authenticatedContext('user456').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    await assertFails(getDoc(patientRef));
  });

  it('should allow approved caregiver to read patient', async () => {
    // Setup: Create approved family connection
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    await setDoc(doc(adminDb, 'family_connections/user123_user456'), {
      patientUserId: 'user123',
      caregiverUserId: 'user456',
      patientId: 'patient123',
      status: 'accepted',
    });

    // Test: Caregiver can read
    const caregiverDb = testEnv.authenticatedContext('user456').firestore();
    const patientRef = doc(caregiverDb, 'patients/patient123');
    
    await assertSucceeds(getDoc(patientRef));
  });

  it('should deny pending caregiver from reading patient', async () => {
    // Setup: Create pending invitation (not accepted)
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    await setDoc(doc(adminDb, 'family_connections/user123_user456'), {
      patientUserId: 'user123',
      caregiverUserId: 'user456',
      patientId: 'patient123',
      status: 'pending', // Not accepted yet
    });

    // Test: Pending caregiver cannot read
    const caregiverDb = testEnv.authenticatedContext('user456').firestore();
    const patientRef = doc(caregiverDb, 'patients/patient123');
    
    await assertFails(getDoc(patientRef));
  });
});

describe('Patient Collection - Update', () => {
  beforeEach(async () => {
    // Setup: Create patient owned by user123
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    await setDoc(doc(adminDb, 'patients/patient123'), {
      resourceType: 'Patient',
      userId: 'user123',
      active: true,
      name: 'John Doe',
      birthDate: '1990-01-01',
      meta: {
        versionId: '1',
        lastUpdated: Timestamp.now(),
      },
    });
  });

  it('should allow owner to update their own patient', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    await assertSucceeds(
      updateDoc(patientRef, {
        name: 'John Smith',
        'meta.versionId': '2',
        'meta.lastUpdated': Timestamp.now(),
      })
    );
  });

  it('should deny non-owner from updating patient', async () => {
    const db = testEnv.authenticatedContext('user456').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    await assertFails(
      updateDoc(patientRef, {
        name: 'Hacker Name',
      })
    );
  });

  it('should deny caregiver from updating patient', async () => {
    // Setup: Create approved family connection
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    await setDoc(doc(adminDb, 'family_connections/user123_user456'), {
      patientUserId: 'user123',
      caregiverUserId: 'user456',
      patientId: 'patient123',
      status: 'accepted',
    });

    // Test: Even approved caregiver cannot update patient profile
    const caregiverDb = testEnv.authenticatedContext('user456').firestore();
    const patientRef = doc(caregiverDb, 'patients/patient123');
    
    await assertFails(
      updateDoc(patientRef, {
        name: 'Changed by Caregiver',
      })
    );
  });

  it('should deny changing resourceType on update', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    await assertFails(
      updateDoc(patientRef, {
        resourceType: 'MedicationRequest', // Cannot change resource type!
      })
    );
  });
});

describe('Patient Collection - Delete', () => {
  beforeEach(async () => {
    // Setup: Create patient owned by user123
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    await setDoc(doc(adminDb, 'patients/patient123'), {
      resourceType: 'Patient',
      userId: 'user123',
      active: true,
      name: 'John Doe',
      meta: {
        versionId: '1',
        lastUpdated: Timestamp.now(),
      },
    });
  });

  it('should allow owner to delete their own patient', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    await assertSucceeds(deleteDoc(patientRef));
  });

  it('should deny non-owner from deleting patient', async () => {
    const db = testEnv.authenticatedContext('user456').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    await assertFails(deleteDoc(patientRef));
  });

  it('should deny caregiver from deleting patient', async () => {
    // Setup: Create approved family connection
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    await setDoc(doc(adminDb, 'family_connections/user123_user456'), {
      patientUserId: 'user123',
      caregiverUserId: 'user456',
      patientId: 'patient123',
      status: 'accepted',
    });

    // Test: Caregiver cannot delete patient
    const caregiverDb = testEnv.authenticatedContext('user456').firestore();
    const patientRef = doc(caregiverDb, 'patients/patient123');
    
    await assertFails(deleteDoc(patientRef));
  });
});

describe('Patient Collection - FHIR Validation', () => {
  it('should enforce FHIR Patient schema on create', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const patientRef = doc(db, 'patients/patient123');
    
    // Valid FHIR Patient
    await assertSucceeds(
      setDoc(patientRef, {
        resourceType: 'Patient',
        userId: 'user123',
        active: true,
        name: 'John Doe',
        birthDate: '1990-01-01',
        gender: 'male',
        photoUrl: 'https://storage.googleapis.com/...',
        role: 'self',
        meta: {
          versionId: '1',
          lastUpdated: Timestamp.now(),
        },
      })
    );
  });

  it('should allow optional FHIR fields', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const patientRef = doc(db, 'patients/patient456');
    
    // Minimal valid patient (optional fields omitted)
    await assertSucceeds(
      setDoc(patientRef, {
        resourceType: 'Patient',
        userId: 'user123',
        active: true,
        name: 'Jane Doe',
        meta: {
          versionId: '1',
          lastUpdated: Timestamp.now(),
        },
      })
    );
  });
});
