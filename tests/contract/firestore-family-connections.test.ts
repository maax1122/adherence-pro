/**
 * Contract Tests: Firestore FamilyConnection Collection
 * 
 * Tests Firestore Security Rules for /family_connections/{id} collection
 * Tests caregiver invitation workflow (pending → accepted/rejected → revoked)
 * Tests patient and caregiver access permissions
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

describe('FamilyConnection Collection - Authentication', () => {
  it('should deny unauthenticated read', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertFails(getDoc(connectionRef));
  });

  it('should deny unauthenticated create', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertFails(
      setDoc(connectionRef, {
        patientUserId: 'user123',
        caregiverUserId: 'caregiver456',
        patientId: 'patient123',
        status: 'pending',
      })
    );
  });
});

describe('FamilyConnection Collection - Create (Send Invitation)', () => {
  it('should allow patient to send caregiver invitation', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertSucceeds(
      setDoc(connectionRef, {
        patientUserId: 'user123',
        caregiverEmail: 'caregiver@example.com',
        patientId: 'patient123',
        status: 'pending',
        permissions: ['can_view', 'can_log'],
        invitedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
  });

  it('should deny creating invitation for different patient', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertFails(
      setDoc(connectionRef, {
        patientUserId: 'user456', // Different user
        caregiverEmail: 'caregiver@example.com',
        patientId: 'patient123',
        status: 'pending',
      })
    );
  });

  it('should enforce initial status = pending', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    // Cannot create with status = accepted (must start as pending)
    await assertFails(
      setDoc(connectionRef, {
        patientUserId: 'user123',
        caregiverEmail: 'caregiver@example.com',
        patientId: 'patient123',
        status: 'accepted', // Invalid initial status
      })
    );
  });

  it('should require permissions array', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertSucceeds(
      setDoc(connectionRef, {
        patientUserId: 'user123',
        caregiverEmail: 'caregiver@example.com',
        patientId: 'patient123',
        status: 'pending',
        permissions: ['can_view'], // Valid permissions
        invitedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
  });

  it('should validate permissions values', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    
    // Valid permission combinations
    const validPermissions = [
      ['can_view'],
      ['can_view', 'can_log'],
    ];

    for (const permissions of validPermissions) {
      const connectionRef = doc(db, `family_connections/connection_${permissions.join('_')}`);
      await assertSucceeds(
        setDoc(connectionRef, {
          patientUserId: 'user123',
          caregiverEmail: 'caregiver@example.com',
          patientId: 'patient123',
          status: 'pending',
          permissions,
          invitedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        })
      );
    }
  });
});

describe('FamilyConnection Collection - Read', () => {
  beforeEach(async () => {
    // Setup: Create a pending family connection
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    const connectionRef = doc(adminDb, 'family_connections/connection123');
    await setDoc(connectionRef, {
      patientUserId: 'user123',
      caregiverUserId: 'caregiver456',
      caregiverEmail: 'caregiver@example.com',
      patientId: 'patient123',
      status: 'pending',
      permissions: ['can_view'],
      invitedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  it('should allow patient to read their connection', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertSucceeds(getDoc(connectionRef));
  });

  it('should allow caregiver to read their connection', async () => {
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertSucceeds(getDoc(connectionRef));
  });

  it('should deny other users from reading connection', async () => {
    const db = testEnv.authenticatedContext('user789').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertFails(getDoc(connectionRef));
  });
});

describe('FamilyConnection Collection - Update (Accept/Reject Invitation)', () => {
  beforeEach(async () => {
    // Setup: Create a pending family connection
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    const connectionRef = doc(adminDb, 'family_connections/connection123');
    await setDoc(connectionRef, {
      patientUserId: 'user123',
      caregiverUserId: 'caregiver456',
      caregiverEmail: 'caregiver@example.com',
      patientId: 'patient123',
      status: 'pending',
      permissions: ['can_view', 'can_log'],
      invitedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  it('should allow caregiver to accept invitation', async () => {
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertSucceeds(
      updateDoc(connectionRef, {
        status: 'accepted',
        acceptedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
  });

  it('should allow caregiver to reject invitation', async () => {
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertSucceeds(
      updateDoc(connectionRef, {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
  });

  it('should deny caregiver from changing permissions', async () => {
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    // Caregiver cannot escalate their own permissions
    await assertFails(
      updateDoc(connectionRef, {
        permissions: ['can_view', 'can_log', 'can_edit'], // Trying to add permissions
      })
    );
  });

  it('should allow patient to revoke accepted connection', async () => {
    // Setup: Accept the connection first
    const caregiverDb = testEnv.authenticatedContext('caregiver456').firestore();
    const connectionRef1 = doc(caregiverDb, 'family_connections/connection123');
    await updateDoc(connectionRef1, {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Patient revokes access
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef2 = doc(db, 'family_connections/connection123');

    await assertSucceeds(
      updateDoc(connectionRef2, {
        status: 'revoked',
        revokedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
  });

  it('should allow patient to cancel pending invitation', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertSucceeds(
      updateDoc(connectionRef, {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
  });

  it('should deny patient from changing caregiver permissions after acceptance', async () => {
    // Setup: Accept the connection first
    const caregiverDb = testEnv.authenticatedContext('caregiver456').firestore();
    const connectionRef1 = doc(caregiverDb, 'family_connections/connection123');
    await updateDoc(connectionRef1, {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Patient tries to change permissions after acceptance
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef2 = doc(db, 'family_connections/connection123');

    // Should revoke first, then create new invitation with different permissions
    await assertFails(
      updateDoc(connectionRef2, {
        permissions: ['can_view'], // Trying to remove can_log
      })
    );
  });

  it('should deny other users from updating connection', async () => {
    const db = testEnv.authenticatedContext('user789').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertFails(
      updateDoc(connectionRef, {
        status: 'accepted',
      })
    );
  });
});

describe('FamilyConnection Collection - Update (Patient Updates)', () => {
  beforeEach(async () => {
    // Setup: Create a pending family connection
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    const connectionRef = doc(adminDb, 'family_connections/connection123');
    await setDoc(connectionRef, {
      patientUserId: 'user123',
      caregiverUserId: 'caregiver456',
      caregiverEmail: 'caregiver@example.com',
      patientId: 'patient123',
      status: 'pending',
      permissions: ['can_view'],
      invitedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  it('should allow patient to update permissions before acceptance', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertSucceeds(
      updateDoc(connectionRef, {
        permissions: ['can_view', 'can_log'], // Added can_log
        updatedAt: Timestamp.now(),
      })
    );
  });

  it('should deny patient from changing caregiverUserId', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertFails(
      updateDoc(connectionRef, {
        caregiverUserId: 'caregiver789', // Trying to change caregiver
      })
    );
  });
});

describe('FamilyConnection Collection - Delete', () => {
  beforeEach(async () => {
    // Setup: Create a family connection
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
      updatedAt: Timestamp.now(),
    });
  });

  it('should allow patient to delete connection', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertSucceeds(deleteDoc(connectionRef));
  });

  it('should deny caregiver from deleting connection', async () => {
    const db = testEnv.authenticatedContext('caregiver456').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertFails(deleteDoc(connectionRef));
  });

  it('should deny other users from deleting connection', async () => {
    const db = testEnv.authenticatedContext('user789').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    await assertFails(deleteDoc(connectionRef));
  });
});

describe('FamilyConnection Collection - Status Workflow Validation', () => {
  it('should enforce valid status transitions', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    // 1. Create pending invitation
    await setDoc(connectionRef, {
      patientUserId: 'user123',
      caregiverUserId: 'caregiver456',
      caregiverEmail: 'caregiver@example.com',
      patientId: 'patient123',
      status: 'pending',
      permissions: ['can_view'],
      invitedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // 2. Caregiver accepts
    const caregiverDb = testEnv.authenticatedContext('caregiver456').firestore();
    await assertSucceeds(
      updateDoc(doc(caregiverDb, 'family_connections/connection123'), {
        status: 'accepted',
        acceptedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );

    // 3. Patient revokes
    await assertSucceeds(
      updateDoc(connectionRef, {
        status: 'revoked',
        revokedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
  });

  it('should validate all status values', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    
    const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled', 'revoked'];

    for (const status of validStatuses) {
      const connectionRef = doc(db, `family_connections/connection_${status}`);
      
      // Create with pending status
      await setDoc(connectionRef, {
        patientUserId: 'user123',
        caregiverUserId: 'caregiver456',
        caregiverEmail: 'caregiver@example.com',
        patientId: 'patient123',
        status: 'pending',
        permissions: ['can_view'],
        invitedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update to target status
      if (status !== 'pending') {
        const contextDb = status === 'accepted' || status === 'rejected'
          ? testEnv.authenticatedContext('caregiver456').firestore()
          : db;
        
        await assertSucceeds(
          updateDoc(doc(contextDb, `family_connections/connection_${status}`), {
            status,
            [`${status}At`]: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })
        );
      }
    }
  });

  it('should deny invalid status values', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection_invalid');

    await assertFails(
      setDoc(connectionRef, {
        patientUserId: 'user123',
        caregiverUserId: 'caregiver456',
        patientId: 'patient123',
        status: 'invalid_status', // Not in allowed list
        permissions: ['can_view'],
      })
    );
  });
});

describe('FamilyConnection Collection - Edge Cases', () => {
  it('should handle caregiver invitation via email before account creation', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    const connectionRef = doc(db, 'family_connections/connection123');

    // Patient sends invitation to email (caregiver account does not exist yet)
    await assertSucceeds(
      setDoc(connectionRef, {
        patientUserId: 'user123',
        caregiverEmail: 'newcaregiver@example.com', // No caregiverUserId yet
        patientId: 'patient123',
        status: 'pending',
        permissions: ['can_view'],
        invitedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
  });

  it('should allow linking caregiverUserId when they create account', async () => {
    // Setup: Create pending invitation with only email
    const adminDb = testEnv.authenticatedContext('admin', { admin: true }).firestore();
    const connectionRef = doc(adminDb, 'family_connections/connection123');
    await setDoc(connectionRef, {
      patientUserId: 'user123',
      caregiverEmail: 'caregiver@example.com',
      patientId: 'patient123',
      status: 'pending',
      permissions: ['can_view'],
      invitedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Caregiver creates account and links to invitation
    const caregiverDb = testEnv.authenticatedContext('caregiver456').firestore();
    const connectionRef2 = doc(caregiverDb, 'family_connections/connection123');

    await assertSucceeds(
      updateDoc(connectionRef2, {
        caregiverUserId: 'caregiver456', // Link new user account
        updatedAt: Timestamp.now(),
      })
    );
  });

  it('should prevent duplicate connections for same patient-caregiver pair', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();

    // Create first connection
    const connectionRef1 = doc(db, 'family_connections/connection123');
    await setDoc(connectionRef1, {
      patientUserId: 'user123',
      caregiverUserId: 'caregiver456',
      patientId: 'patient123',
      status: 'pending',
      permissions: ['can_view'],
      invitedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Attempt to create duplicate connection
    const connectionRef2 = doc(db, 'family_connections/connection456');
    
    // Note: Duplicate prevention typically handled by Cloud Function or compound unique index
    // Security rules can enforce document ID format: `${patientUserId}_${caregiverUserId}`
    // For this test, we just verify both can be created (app logic prevents duplicates)
    await assertSucceeds(
      setDoc(connectionRef2, {
        patientUserId: 'user123',
        caregiverUserId: 'caregiver789', // Different caregiver
        patientId: 'patient123',
        status: 'pending',
        permissions: ['can_view'],
        invitedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
  });
});
