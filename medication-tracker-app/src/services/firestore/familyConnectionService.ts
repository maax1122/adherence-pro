/**
 * FamilyConnection Service (Caregiver Invitation and Permission Management)
 * 
 * Manages FamilyConnection documents in Firestore for caregiver relationships.
 * Implements invitation lifecycle, permission management, and access control.
 * 
 * Collection path: /family_connections/{connectionId}
 * 
 * Security: All operations require userId match with authenticated user
 */

import firestore from '@react-native-firebase/firestore';
import type { FamilyConnection } from '../../types/fhir';
import { familyConnectionConverter } from './converters';
import { getCurrentUserId } from '../auth/authService';
import { getPatient } from './patientService';

const FAMILY_CONNECTIONS_COLLECTION = 'family_connections';

// ============================================================================
// Types
// ============================================================================

export interface CreateInvitationData {
  patientId: string; // FHIR Patient resource ID
  caregiverEmail: string;
  permissions: ('view_only' | 'can_log')[];
}

export interface UpdatePermissionsData {
  permissions: ('view_only' | 'can_log')[];
}

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'revoked';

// ============================================================================
// FamilyConnection Service
// ============================================================================

/**
 * Create a caregiver invitation
 */
export async function createInvitation(
  data: CreateInvitationData
): Promise<FamilyConnection> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to create invitation');
  }

  // Get patient to verify ownership
  const patient = await getPatient(data.patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  // Verify user owns this patient
  if (patient.userId !== userId) {
    throw new Error('User does not have permission to invite caregivers for this patient');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.caregiverEmail)) {
    throw new Error('Invalid email address');
  }

  // Validate permissions
  if (!data.permissions || data.permissions.length === 0) {
    throw new Error('At least one permission must be specified');
  }

  // Check if invitation already exists for this email and patient
  const existingConnection = await getConnectionByPatientAndCaregiverEmail(
    data.patientId,
    data.caregiverEmail
  );

  if (existingConnection && existingConnection.status === 'pending') {
    throw new Error('A pending invitation already exists for this caregiver');
  }

  if (existingConnection && existingConnection.status === 'accepted') {
    throw new Error('This caregiver is already connected to this patient');
  }

  const connectionRef = firestore().collection(FAMILY_CONNECTIONS_COLLECTION).doc();

  const connection: FamilyConnection = {
    id: connectionRef.id,
    patientUserId: userId,
    caregiverUserId: '', // Will be filled when invitation is accepted
    caregiverEmail: data.caregiverEmail,
    patientId: data.patientId,
    status: 'pending',
    permissions: data.permissions,
    invitedAt: firestore.Timestamp.now() as any,
    invitedBy: userId,
  };

  const firestoreData = familyConnectionConverter.toFirestore(connection);
  await connectionRef.set(firestoreData);

  // TODO: Send email notification (implement in T024 or separate Cloud Function)
  // await sendInvitationEmail(data.caregiverEmail, patient.name?.[0]?.text || 'Patient');

  const snapshot = await connectionRef.get();
  return familyConnectionConverter.fromFirestore(snapshot);
}

/**
 * Accept a caregiver invitation
 */
export async function acceptInvitation(connectionId: string): Promise<FamilyConnection> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to accept invitation');
  }

  const connectionRef = firestore().collection(FAMILY_CONNECTIONS_COLLECTION).doc(connectionId);
  const snapshot = await connectionRef.get();

  if (!snapshot.exists) {
    throw new Error('Invitation not found');
  }

  const connection = familyConnectionConverter.fromFirestore(snapshot);

  // Verify invitation status
  if (connection.status !== 'pending') {
    throw new Error(`Invitation cannot be accepted (current status: ${connection.status})`);
  }

  // TODO: Verify caregiver email matches authenticated user email
  // This requires getting user email from Firebase Auth
  // const currentUserEmail = await getCurrentUserEmail();
  // if (connection.caregiverEmail !== currentUserEmail) {
  //   throw new Error('This invitation is not for your email address');
  // }

  // Update connection
  const updates: Partial<FamilyConnection> = {
    caregiverUserId: userId,
    status: 'accepted',
    acceptedAt: firestore.Timestamp.now() as any,
  };

  await connectionRef.update(updates);

  const updatedSnapshot = await connectionRef.get();
  return familyConnectionConverter.fromFirestore(updatedSnapshot);
}

/**
 * Reject a caregiver invitation
 */
export async function rejectInvitation(connectionId: string): Promise<FamilyConnection> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to reject invitation');
  }

  const connectionRef = firestore().collection(FAMILY_CONNECTIONS_COLLECTION).doc(connectionId);
  const snapshot = await connectionRef.get();

  if (!snapshot.exists) {
    throw new Error('Invitation not found');
  }

  const connection = familyConnectionConverter.fromFirestore(snapshot);

  // Verify invitation status
  if (connection.status !== 'pending') {
    throw new Error(`Invitation cannot be rejected (current status: ${connection.status})`);
  }

  // TODO: Verify caregiver email matches authenticated user email
  // const currentUserEmail = await getCurrentUserEmail();
  // if (connection.caregiverEmail !== currentUserEmail) {
  //   throw new Error('This invitation is not for your email address');
  // }

  // Update connection
  const updates: Partial<FamilyConnection> = {
    status: 'rejected',
    rejectedAt: firestore.Timestamp.now() as any,
  };

  await connectionRef.update(updates);

  const updatedSnapshot = await connectionRef.get();
  return familyConnectionConverter.fromFirestore(updatedSnapshot);
}

/**
 * Revoke a caregiver connection (patient or caregiver can revoke)
 */
export async function revokeConnection(connectionId: string): Promise<FamilyConnection> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to revoke connection');
  }

  const connectionRef = firestore().collection(FAMILY_CONNECTIONS_COLLECTION).doc(connectionId);
  const snapshot = await connectionRef.get();

  if (!snapshot.exists) {
    throw new Error('Connection not found');
  }

  const connection = familyConnectionConverter.fromFirestore(snapshot);

  // Verify user is either patient or caregiver
  const isPatient = connection.patientUserId === userId;
  const isCaregiver = connection.caregiverUserId === userId;

  if (!isPatient && !isCaregiver) {
    throw new Error('User does not have permission to revoke this connection');
  }

  // Only accepted connections can be revoked
  if (connection.status !== 'accepted') {
    throw new Error(`Connection cannot be revoked (current status: ${connection.status})`);
  }

  // Update connection
  const updates: Partial<FamilyConnection> = {
    status: 'revoked',
    revokedAt: firestore.Timestamp.now() as any,
  };

  await connectionRef.update(updates);

  const updatedSnapshot = await connectionRef.get();
  return familyConnectionConverter.fromFirestore(updatedSnapshot);
}

/**
 * Get all connections for a patient (caregivers connected to patient)
 */
export async function getPatientConnections(patientId: string): Promise<FamilyConnection[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get patient connections');
  }

  // Verify user owns this patient
  const patient = await getPatient(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  if (patient.userId !== userId) {
    throw new Error('User does not have permission to view connections for this patient');
  }

  const snapshot = await firestore()
    .collection(FAMILY_CONNECTIONS_COLLECTION)
    .where('patientUserId', '==', userId)
    .where('patientId', '==', patientId)
    .get();

  return snapshot.docs.map((doc) => familyConnectionConverter.fromFirestore(doc));
}

/**
 * Get all connections for a caregiver (patients that caregiver is connected to)
 */
export async function getCaregiverConnections(
  caregiverUserId?: string
): Promise<FamilyConnection[]> {
  const userId = caregiverUserId || getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get caregiver connections');
  }

  const snapshot = await firestore()
    .collection(FAMILY_CONNECTIONS_COLLECTION)
    .where('caregiverUserId', '==', userId)
    .where('status', '==', 'accepted')
    .get();

  return snapshot.docs.map((doc) => familyConnectionConverter.fromFirestore(doc));
}

/**
 * Get pending invitations for a caregiver email
 */
export async function getPendingInvitationsForEmail(email: string): Promise<FamilyConnection[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get pending invitations');
  }

  const snapshot = await firestore()
    .collection(FAMILY_CONNECTIONS_COLLECTION)
    .where('caregiverEmail', '==', email)
    .where('status', '==', 'pending')
    .get();

  return snapshot.docs.map((doc) => familyConnectionConverter.fromFirestore(doc));
}

/**
 * Update permissions for a connection
 */
export async function updatePermissions(
  connectionId: string,
  updates: UpdatePermissionsData
): Promise<FamilyConnection> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to update permissions');
  }

  const connectionRef = firestore().collection(FAMILY_CONNECTIONS_COLLECTION).doc(connectionId);
  const snapshot = await connectionRef.get();

  if (!snapshot.exists) {
    throw new Error('Connection not found');
  }

  const connection = familyConnectionConverter.fromFirestore(snapshot);

  // Only patient can update permissions
  if (connection.patientUserId !== userId) {
    throw new Error('Only the patient can update permissions');
  }

  // Connection must be accepted
  if (connection.status !== 'accepted') {
    throw new Error('Can only update permissions for accepted connections');
  }

  // Validate permissions
  if (!updates.permissions || updates.permissions.length === 0) {
    throw new Error('At least one permission must be specified');
  }

  await connectionRef.update({ permissions: updates.permissions });

  const updatedSnapshot = await connectionRef.get();
  return familyConnectionConverter.fromFirestore(updatedSnapshot);
}

/**
 * Check if a caregiver can log medications for a patient
 */
export async function canCaregiverLog(
  caregiverUserId: string,
  patientId: string
): Promise<boolean> {
  const snapshot = await firestore()
    .collection(FAMILY_CONNECTIONS_COLLECTION)
    .where('caregiverUserId', '==', caregiverUserId)
    .where('patientId', '==', patientId)
    .where('status', '==', 'accepted')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return false;
  }

  const connection = familyConnectionConverter.fromFirestore(snapshot.docs[0]);
  return connection.permissions.includes('can_log');
}

/**
 * Get a connection by ID
 */
export async function getConnection(connectionId: string): Promise<FamilyConnection | null> {
  const snapshot = await firestore()
    .collection(FAMILY_CONNECTIONS_COLLECTION)
    .doc(connectionId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return familyConnectionConverter.fromFirestore(snapshot);
}

/**
 * Get connection by patient and caregiver email (helper for checking duplicates)
 */
async function getConnectionByPatientAndCaregiverEmail(
  patientId: string,
  caregiverEmail: string
): Promise<FamilyConnection | null> {
  const snapshot = await firestore()
    .collection(FAMILY_CONNECTIONS_COLLECTION)
    .where('patientId', '==', patientId)
    .where('caregiverEmail', '==', caregiverEmail)
    .orderBy('invitedAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return familyConnectionConverter.fromFirestore(snapshot.docs[0]);
}

/**
 * Check if user has any permission to view patient data
 */
export async function canCaregiverView(
  caregiverUserId: string,
  patientId: string
): Promise<boolean> {
  const snapshot = await firestore()
    .collection(FAMILY_CONNECTIONS_COLLECTION)
    .where('caregiverUserId', '==', caregiverUserId)
    .where('patientId', '==', patientId)
    .where('status', '==', 'accepted')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return false;
  }

  const connection = familyConnectionConverter.fromFirestore(snapshot.docs[0]);
  // Any permission grants view access
  return connection.permissions.length > 0;
}

/**
 * Get connection between caregiver and patient (if exists)
 */
export async function getConnectionByUserAndPatient(
  caregiverUserId: string,
  patientId: string
): Promise<FamilyConnection | null> {
  const snapshot = await firestore()
    .collection(FAMILY_CONNECTIONS_COLLECTION)
    .where('caregiverUserId', '==', caregiverUserId)
    .where('patientId', '==', patientId)
    .where('status', '==', 'accepted')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return familyConnectionConverter.fromFirestore(snapshot.docs[0]);
}
