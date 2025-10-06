/**
 * T009: Contract Test - Firestore Security Rules for FamilyConnections
 * 
 * Tests family connection (caregiver invitation) security rules to ensure:
 * - Patient can create invitation (status: pending)
 * - Patient cannot invite self (patientUserId !== caregiverUserId)
 * - Caregiver can accept invitation (pending → accepted)
 * - Caregiver can reject invitation (pending → rejected)
 * - Caregiver cannot accept already-accepted invitation
 * - Patient can revoke accepted connection (accepted → revoked)
 * - Caregiver cannot revoke connection (only patient can)
 * - Both patient and caregiver can read connection document
 * - Third party cannot read connection
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

describe('T009: Firestore Security Rules - FamilyConnections Collection', () => {
  let testEnv: RulesTestEnvironment;

  // Test user IDs
  const ALICE_UID = 'alice-user-id';
  const CAROL_UID = 'carol-caregiver-id';
  const DAVE_UID = 'dave-third-party-id';

  // Test patient IDs
  const ALICE_PATIENT_ID = 'patient-alice-001';

  // Connection IDs (format: caregiverUserId_patientId)
  const CONNECTION_CAROL_ALICE = `${CAROL_UID}_${ALICE_PATIENT_ID}`;

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

  describe('✅ TEST 1: Patient can create invitation (status: pending)', () => {
    it('should allow patient to create family connection invitation', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const connectionRef = doc(aliceDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const familyConnectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'pending',
        permissionLevel: 'view_only',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await assertSucceeds(setDoc(connectionRef, familyConnectionData));
    });

    it('should allow patient to create invitation with can_log permission', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const connectionRef = doc(aliceDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const familyConnectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'pending',
        permissionLevel: 'can_log',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await assertSucceeds(setDoc(connectionRef, familyConnectionData));
    });
  });

  describe('❌ TEST 2: Patient cannot invite self (patientUserId !== caregiverUserId)', () => {
    it('should deny patient from inviting themselves as caregiver', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const selfConnectionRef = doc(aliceDb, 'family_connections', `${ALICE_UID}_${ALICE_PATIENT_ID}`);

      const selfInvitationData = {
        patientUserId: ALICE_UID,
        caregiverUserId: ALICE_UID, // Same as patient
        patientId: ALICE_PATIENT_ID,
        status: 'pending',
        permissionLevel: 'view_only',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await assertFails(setDoc(selfConnectionRef, selfInvitationData));
    });
  });

  describe('✅ TEST 3: Caregiver can accept invitation (pending → accepted)', () => {
    it('should allow caregiver to accept pending invitation', async () => {
      // Setup: Create pending invitation (with rules disabled)
      const pendingConnectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'pending',
        permissionLevel: 'view_only',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          pendingConnectionData,
        );
      });

      // Test: Carol can accept the invitation
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const connectionRef = doc(carolDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const acceptedData = {
        ...pendingConnectionData,
        status: 'accepted',
        updatedAt: serverTimestamp(),
      };

      await assertSucceeds(setDoc(connectionRef, acceptedData));
    });
  });

  describe('✅ TEST 4: Caregiver can reject invitation (pending → rejected)', () => {
    it('should allow caregiver to reject pending invitation', async () => {
      // Setup: Create pending invitation
      const pendingConnectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'pending',
        permissionLevel: 'view_only',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          pendingConnectionData,
        );
      });

      // Test: Carol can reject the invitation
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const connectionRef = doc(carolDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const rejectedData = {
        ...pendingConnectionData,
        status: 'rejected',
        updatedAt: serverTimestamp(),
      };

      await assertSucceeds(setDoc(connectionRef, rejectedData));
    });
  });

  describe('❌ TEST 5: Caregiver cannot accept already-accepted invitation', () => {
    it('should deny caregiver from updating already-accepted connection', async () => {
      // Setup: Create accepted connection
      const acceptedConnectionData = {
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
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          acceptedConnectionData,
        );
      });

      // Test: Carol cannot update already-accepted connection
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const connectionRef = doc(carolDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const modifiedData = {
        ...acceptedConnectionData,
        permissionLevel: 'can_log', // Try to change permission
        updatedAt: serverTimestamp(),
      };

      await assertFails(setDoc(connectionRef, modifiedData));
    });
  });

  describe('✅ TEST 6: Patient can revoke accepted connection (accepted → revoked)', () => {
    it('should allow patient to revoke accepted connection', async () => {
      // Setup: Create accepted connection
      const acceptedConnectionData = {
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
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          acceptedConnectionData,
        );
      });

      // Test: Alice can revoke the connection
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const connectionRef = doc(aliceDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const revokedData = {
        ...acceptedConnectionData,
        status: 'revoked',
        updatedAt: serverTimestamp(),
      };

      await assertSucceeds(setDoc(connectionRef, revokedData));
    });

    it('should deny patient from revoking pending connection', async () => {
      // Setup: Create pending connection
      const pendingConnectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'pending',
        permissionLevel: 'view_only',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          pendingConnectionData,
        );
      });

      // Test: Alice cannot revoke pending connection (can only revoke accepted)
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const connectionRef = doc(aliceDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const revokedData = {
        ...pendingConnectionData,
        status: 'revoked',
        updatedAt: serverTimestamp(),
      };

      await assertFails(setDoc(connectionRef, revokedData));
    });
  });

  describe('❌ TEST 7: Caregiver cannot revoke connection (only patient can)', () => {
    it('should deny caregiver from revoking accepted connection', async () => {
      // Setup: Create accepted connection
      const acceptedConnectionData = {
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
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          acceptedConnectionData,
        );
      });

      // Test: Carol cannot revoke the connection (only patient can)
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const connectionRef = doc(carolDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const revokedData = {
        ...acceptedConnectionData,
        status: 'revoked',
        updatedAt: serverTimestamp(),
      };

      await assertFails(setDoc(connectionRef, revokedData));
    });
  });

  describe('✅ TEST 8: Both patient and caregiver can read connection document', () => {
    it('should allow patient to read connection document', async () => {
      // Setup: Create family connection
      const connectionData = {
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
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          connectionData,
        );
      });

      // Test: Alice can read the connection
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const connectionRef = doc(aliceDb, 'family_connections', CONNECTION_CAROL_ALICE);

      await assertSucceeds(getDoc(connectionRef));
    });

    it('should allow caregiver to read connection document', async () => {
      // Setup: Create family connection
      const connectionData = {
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
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          connectionData,
        );
      });

      // Test: Carol can read the connection
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const connectionRef = doc(carolDb, 'family_connections', CONNECTION_CAROL_ALICE);

      await assertSucceeds(getDoc(connectionRef));
    });

    it('should allow both patient and caregiver to read pending connection', async () => {
      // Setup: Create pending connection
      const pendingConnectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'pending',
        permissionLevel: 'view_only',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          pendingConnectionData,
        );
      });

      // Test: Alice can read pending connection
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const aliceConnectionRef = doc(aliceDb, 'family_connections', CONNECTION_CAROL_ALICE);
      await assertSucceeds(getDoc(aliceConnectionRef));

      // Test: Carol can read pending connection
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const carolConnectionRef = doc(carolDb, 'family_connections', CONNECTION_CAROL_ALICE);
      await assertSucceeds(getDoc(carolConnectionRef));
    });
  });

  describe('❌ TEST 9: Third party cannot read connection', () => {
    it('should deny third party from reading connection document', async () => {
      // Setup: Create family connection between Alice and Carol
      const connectionData = {
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
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          connectionData,
        );
      });

      // Test: Dave (third party) cannot read Alice-Carol connection
      const daveDb = testEnv.authenticatedContext(DAVE_UID).firestore();
      const connectionRef = doc(daveDb, 'family_connections', CONNECTION_CAROL_ALICE);

      await assertFails(getDoc(connectionRef));
    });

    it('should deny unauthenticated user from reading connection document', async () => {
      // Setup: Create family connection
      const connectionData = {
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
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          connectionData,
        );
      });

      // Test: Unauthenticated user cannot read connection
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const connectionRef = doc(unauthDb, 'family_connections', CONNECTION_CAROL_ALICE);

      await assertFails(getDoc(connectionRef));
    });

    it('should deny third party from creating connection on behalf of others', async () => {
      // Test: Dave cannot create connection for Alice
      const daveDb = testEnv.authenticatedContext(DAVE_UID).firestore();
      const connectionRef = doc(daveDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const connectionData = {
        patientUserId: ALICE_UID, // Not Dave's ID
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'pending',
        permissionLevel: 'view_only',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await assertFails(setDoc(connectionRef, connectionData));
    });
  });

  describe('Additional Edge Cases', () => {
    it('should deny patient from creating invitation with non-pending status', async () => {
      const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
      const connectionRef = doc(aliceDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const directlyAcceptedData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'accepted', // Should be pending on create
        permissionLevel: 'view_only',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await assertFails(setDoc(connectionRef, directlyAcceptedData));
    });

    it('should deny caregiver from creating invitation', async () => {
      // Test: Carol cannot create invitation (only patient can)
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const connectionRef = doc(carolDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const connectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'pending',
        permissionLevel: 'view_only',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await assertFails(setDoc(connectionRef, connectionData));
    });

    it('should deny caregiver from changing status to anything other than accepted/rejected', async () => {
      // Setup: Create pending connection
      const pendingConnectionData = {
        patientUserId: ALICE_UID,
        caregiverUserId: CAROL_UID,
        patientId: ALICE_PATIENT_ID,
        status: 'pending',
        permissionLevel: 'view_only',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'family_connections', CONNECTION_CAROL_ALICE),
          pendingConnectionData,
        );
      });

      // Test: Carol cannot set status to revoked (only patient can revoke)
      const carolDb = testEnv.authenticatedContext(CAROL_UID).firestore();
      const connectionRef = doc(carolDb, 'family_connections', CONNECTION_CAROL_ALICE);

      const revokedData = {
        ...pendingConnectionData,
        status: 'revoked',
        updatedAt: serverTimestamp(),
      };

      await assertFails(setDoc(connectionRef, revokedData));
    });
  });
});
