/**
 * FamilyConnection Service (Caregiver Invitation and Permission Management) - Web
 * 
 * Manages FamilyConnection documents in Firestore for caregiver relationships.
 * Implements invitation lifecycle, permission management, and access control.
 * 
 * Collection path: /family_connections/{connectionId}
 * 
 * Security: All operations require userId match with authenticated user
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { FamilyConnection } from '@/types/fhir';
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
 * 
 * @param data - Invitation data
 * @returns Promise with created FamilyConnection
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

  const connectionRef = doc(collection(db, FAMILY_CONNECTIONS_COLLECTION));

  const connection: FamilyConnection = {
    id: connectionRef.id,
    patientUserId: userId,
    caregiverUserId: '', // Will be filled when invitation is accepted
    caregiverEmail: data.caregiverEmail,
    patientId: data.patientId,
    status: 'pending',
    permissions: data.permissions,
    invitedAt: Timestamp.now(),
    invitedBy: userId,
  };

  const firestoreData = familyConnectionConverter.toFirestore(connection);
  await setDoc(connectionRef, firestoreData);

  const snapshot = await getDoc(connectionRef);
  return familyConnectionConverter.fromFirestore(snapshot);
}

/**
 * Accept a caregiver invitation
 * 
 * @param connectionId - FamilyConnection document ID
 * @returns Promise with updated FamilyConnection
 */
export async function acceptInvitation(connectionId: string): Promise<FamilyConnection> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to accept invitation');
  }

  const connectionRef = doc(db, FAMILY_CONNECTIONS_COLLECTION, connectionId);
  const snapshot = await getDoc(connectionRef);

  if (!snapshot.exists()) {
    throw new Error('Invitation not found');
  }

  const connection = familyConnectionConverter.fromFirestore(snapshot);

  // Verify invitation status
  if (connection.status !== 'pending') {
    throw new Error(`Invitation cannot be accepted (current status: ${connection.status})`);
  }

  // Update connection
  await updateDoc(connectionRef, {
    caregiverUserId: userId,
    status: 'accepted',
    acceptedAt: Timestamp.now(),
  });

  const updatedSnapshot = await getDoc(connectionRef);
  return familyConnectionConverter.fromFirestore(updatedSnapshot);
}

/**
 * Reject a caregiver invitation
 * 
 * @param connectionId - FamilyConnection document ID
 * @returns Promise with updated FamilyConnection
 */
export async function rejectInvitation(connectionId: string): Promise<FamilyConnection> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to reject invitation');
  }

  const connectionRef = doc(db, FAMILY_CONNECTIONS_COLLECTION, connectionId);
  const snapshot = await getDoc(connectionRef);

  if (!snapshot.exists()) {
    throw new Error('Invitation not found');
  }

  const connection = familyConnectionConverter.fromFirestore(snapshot);

  // Verify invitation status
  if (connection.status !== 'pending') {
    throw new Error(`Invitation cannot be rejected (current status: ${connection.status})`);
  }

  // Update connection
  await updateDoc(connectionRef, {
    caregiverUserId: userId,
    status: 'rejected',
    rejectedAt: Timestamp.now(),
  });

  const updatedSnapshot = await getDoc(connectionRef);
  return familyConnectionConverter.fromFirestore(updatedSnapshot);
}

/**
 * Revoke a caregiver connection
 * 
 * @param connectionId - FamilyConnection document ID
 * @returns Promise with updated FamilyConnection
 */
export async function revokeConnection(connectionId: string): Promise<FamilyConnection> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to revoke connection');
  }

  const connectionRef = doc(db, FAMILY_CONNECTIONS_COLLECTION, connectionId);
  const snapshot = await getDoc(connectionRef);

  if (!snapshot.exists()) {
    throw new Error('Connection not found');
  }

  const connection = familyConnectionConverter.fromFirestore(snapshot);

  // Verify user is the patient (inviter)
  if (connection.patientUserId !== userId) {
    throw new Error('Only the patient can revoke a connection');
  }

  // Can only revoke accepted connections
  if (connection.status !== 'accepted') {
    throw new Error(`Connection cannot be revoked (current status: ${connection.status})`);
  }

  // Update connection
  await updateDoc(connectionRef, {
    status: 'revoked',
    revokedAt: Timestamp.now(),
  });

  const updatedSnapshot = await getDoc(connectionRef);
  return familyConnectionConverter.fromFirestore(updatedSnapshot);
}

/**
 * Get all connections for a patient
 * 
 * @param patientId - Patient document ID
 * @returns Promise with array of FamilyConnections
 */
export async function getPatientConnections(patientId: string): Promise<FamilyConnection[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get patient connections');
  }

  const connectionsRef = collection(db, FAMILY_CONNECTIONS_COLLECTION);
  const q = query(
    connectionsRef,
    where('patientUserId', '==', userId),
    where('patientId', '==', patientId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => familyConnectionConverter.fromFirestore(doc));
}

/**
 * Get all connections where user is the caregiver
 * 
 * @param userId - Optional user ID (defaults to current user)
 * @returns Promise with array of FamilyConnections
 */
export async function getCaregiverConnections(
  userId?: string
): Promise<FamilyConnection[]> {
  const targetUserId = userId || getCurrentUserId();
  if (!targetUserId) {
    throw new Error('User must be authenticated to get caregiver connections');
  }

  const connectionsRef = collection(db, FAMILY_CONNECTIONS_COLLECTION);
  const q = query(
    connectionsRef,
    where('caregiverUserId', '==', targetUserId),
    where('status', '==', 'accepted')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => familyConnectionConverter.fromFirestore(doc));
}

/**
 * Get pending invitations for an email
 * 
 * @param email - Caregiver email address
 * @returns Promise with array of pending FamilyConnections
 */
export async function getPendingInvitationsForEmail(email: string): Promise<FamilyConnection[]> {
  const connectionsRef = collection(db, FAMILY_CONNECTIONS_COLLECTION);
  const q = query(
    connectionsRef,
    where('caregiverEmail', '==', email),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => familyConnectionConverter.fromFirestore(doc));
}

/**
 * Update permissions for a connection
 * 
 * @param connectionId - FamilyConnection document ID
 * @param data - Updated permissions
 * @returns Promise with updated FamilyConnection
 */
export async function updatePermissions(
  connectionId: string,
  data: UpdatePermissionsData
): Promise<FamilyConnection> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to update permissions');
  }

  const connectionRef = doc(db, FAMILY_CONNECTIONS_COLLECTION, connectionId);
  const snapshot = await getDoc(connectionRef);

  if (!snapshot.exists()) {
    throw new Error('Connection not found');
  }

  const connection = familyConnectionConverter.fromFirestore(snapshot);

  // Verify user is the patient (inviter)
  if (connection.patientUserId !== userId) {
    throw new Error('Only the patient can update permissions');
  }

  // Can only update accepted connections
  if (connection.status !== 'accepted') {
    throw new Error('Can only update permissions for accepted connections');
  }

  // Validate permissions
  if (!data.permissions || data.permissions.length === 0) {
    throw new Error('At least one permission must be specified');
  }

  // Update connection
  await updateDoc(connectionRef, {
    permissions: data.permissions,
  });

  const updatedSnapshot = await getDoc(connectionRef);
  return familyConnectionConverter.fromFirestore(updatedSnapshot);
}

/**
 * Check if caregiver has permission to log medications
 * 
 * @param caregiverUserId - Caregiver user ID
 * @param patientId - Patient document ID
 * @returns Promise with boolean indicating permission
 */
export async function canCaregiverLog(
  caregiverUserId: string,
  patientId: string
): Promise<boolean> {
  const connectionsRef = collection(db, FAMILY_CONNECTIONS_COLLECTION);
  const q = query(
    connectionsRef,
    where('caregiverUserId', '==', caregiverUserId),
    where('patientId', '==', patientId),
    where('status', '==', 'accepted')
  );

  const snapshot = await getDocs(q);
  
  for (const doc of snapshot.docs) {
    const connection = familyConnectionConverter.fromFirestore(doc);
    if (connection.permissions.includes('can_log')) {
      return true;
    }
  }

  return false;
}

/**
 * Get a connection by ID
 * 
 * @param connectionId - FamilyConnection document ID
 * @returns Promise with FamilyConnection or null
 */
export async function getConnection(connectionId: string): Promise<FamilyConnection | null> {
  const connectionRef = doc(db, FAMILY_CONNECTIONS_COLLECTION, connectionId);
  const snapshot = await getDoc(connectionRef);

  if (!snapshot.exists()) {
    return null;
  }

  return familyConnectionConverter.fromFirestore(snapshot);
}

/**
 * Check if caregiver has permission to view patient data
 * 
 * @param caregiverUserId - Caregiver user ID
 * @param patientId - Patient document ID
 * @returns Promise with boolean indicating permission
 */
export async function canCaregiverView(
  caregiverUserId: string,
  patientId: string
): Promise<boolean> {
  const connectionsRef = collection(db, FAMILY_CONNECTIONS_COLLECTION);
  const q = query(
    connectionsRef,
    where('caregiverUserId', '==', caregiverUserId),
    where('patientId', '==', patientId),
    where('status', '==', 'accepted')
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Get connection by patient and caregiver email
 * 
 * @param patientId - Patient document ID
 * @param caregiverEmail - Caregiver email address
 * @returns Promise with FamilyConnection or null
 */
export async function getConnectionByPatientAndCaregiverEmail(
  patientId: string,
  caregiverEmail: string
): Promise<FamilyConnection | null> {
  const connectionsRef = collection(db, FAMILY_CONNECTIONS_COLLECTION);
  const q = query(
    connectionsRef,
    where('patientId', '==', patientId),
    where('caregiverEmail', '==', caregiverEmail)
  );

  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }

  return familyConnectionConverter.fromFirestore(snapshot.docs[0]);
}
