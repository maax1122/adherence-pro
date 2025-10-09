/**
 * MedicationRequest Service (FHIR MedicationRequest CRUD) - Web
 * 
 * Manages FHIR MedicationRequest resources in Firestore.
 * Implements create, read, update, delete operations.
 * 
 * Collection path: /medication_requests/{requestId}
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
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { MedicationRequestDocument, FHIRDosage, FHIRCodeableConcept } from '@/types/fhir';
import { medicationRequestConverter } from './converters';
import { getCurrentUserId } from '../auth/authService';
import { isPatientOwnedByUser } from './patientService';

const MEDICATION_REQUESTS_COLLECTION = 'medication_requests';

// ============================================================================
// Types
// ============================================================================

export interface CreateMedicationRequestData {
  patientId: string;
  medicationName: string;
  dosageInstruction?: FHIRDosage[];
  isPRN?: boolean;
  status?: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped' | 'draft';
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  dispenseRequest?: {
    validityPeriod?: {
      start?: string;
      end?: string;
    };
    numberOfRepeatsAllowed?: number;
    quantity?: {
      value?: number;
      unit?: string;
    };
  };
}

export interface UpdateMedicationRequestData {
  medicationName?: string;
  dosageInstruction?: FHIRDosage[];
  status?: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped';
  isPRN?: boolean;
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
}

// ============================================================================
// MedicationRequest Service
// ============================================================================

/**
 * Create a new MedicationRequest resource
 * 
 * @param data - Medication request creation data
 * @returns Promise with created MedicationRequestDocument
 * 
 * @example
 * ```ts
 * const medRequest = await createMedicationRequest({
 *   patientId: 'patient123',
 *   medicationName: 'Aspirin 100mg',
 *   dosageInstruction: [{
 *     text: 'Take one tablet daily',
 *     timing: { repeat: { frequency: 1, period: 1, periodUnit: 'd' } }
 *   }],
 *   isPRN: false
 * });
 * ```
 */
export async function createMedicationRequest(
  data: CreateMedicationRequestData
): Promise<MedicationRequestDocument> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to create a medication request');
  }

  // Verify patient ownership
  const ownsPatient = await isPatientOwnedByUser(data.patientId, userId);
  if (!ownsPatient) {
    throw new Error('Patient does not belong to the authenticated user');
  }

  const requestRef = doc(collection(db, MEDICATION_REQUESTS_COLLECTION));

  // Build medication codeable concept
  const medicationCodeableConcept: FHIRCodeableConcept = {
    text: data.medicationName,
    coding: [
      {
        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        display: data.medicationName,
      },
    ],
  };

  const medicationRequest: MedicationRequestDocument = {
    resourceType: 'MedicationRequest',
    id: requestRef.id,
    userId: userId,
    patientId: data.patientId,
    medicationName: data.medicationName,
    status: data.status || 'active',
    intent: 'order',
    priority: data.priority,
    subject: {
      reference: `Patient/${data.patientId}`,
    },
    medicationCodeableConcept,
    dosageInstruction: data.dosageInstruction || [],
    dispenseRequest: data.dispenseRequest,
    authoredOn: new Date().toISOString(),
    isPRN: data.isPRN ?? data.dosageInstruction?.[0]?.asNeededBoolean ?? false,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/MedicationRequest'],
      versionId: '1',
    },
  };

  const firestoreData = medicationRequestConverter.toFirestore(medicationRequest);
  await setDoc(requestRef, firestoreData);

  const snapshot = await getDoc(requestRef);
  return medicationRequestConverter.fromFirestore(snapshot);
}

/**
 * Get a MedicationRequest by ID
 * 
 * @param requestId - MedicationRequest document ID
 * @returns Promise with MedicationRequestDocument or null
 */
export async function getMedicationRequest(
  requestId: string
): Promise<MedicationRequestDocument | null> {
  const requestRef = doc(db, MEDICATION_REQUESTS_COLLECTION, requestId);
  const snapshot = await getDoc(requestRef);

  if (!snapshot.exists()) {
    return null;
  }

  return medicationRequestConverter.fromFirestore(snapshot);
}

/**
 * Get all MedicationRequests for a patient
 * 
 * @param patientId - Patient document ID
 * @param status - Optional status filter
 * @returns Promise with array of MedicationRequestDocuments
 */
export async function getPatientMedicationRequests(
  patientId: string,
  status?: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped'
): Promise<MedicationRequestDocument[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get medication requests');
  }

  // Verify patient ownership
  const ownsPatient = await isPatientOwnedByUser(patientId, userId);
  if (!ownsPatient) {
    throw new Error('Patient does not belong to the authenticated user');
  }

  const requestsRef = collection(db, MEDICATION_REQUESTS_COLLECTION);
  
  let q = query(
    requestsRef,
    where('userId', '==', userId),
    where('patientId', '==', patientId)
  );

  if (status) {
    q = query(q, where('status', '==', status));
  }

  q = query(q, orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => medicationRequestConverter.fromFirestore(doc));
}

/**
 * Get all MedicationRequests for a user
 * 
 * @param userId - Optional user ID (defaults to current user)
 * @param status - Optional status filter
 * @returns Promise with array of MedicationRequestDocuments
 */
export async function getUserMedicationRequests(
  userId?: string,
  status?: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped'
): Promise<MedicationRequestDocument[]> {
  const targetUserId = userId || getCurrentUserId();
  if (!targetUserId) {
    throw new Error('User must be authenticated to get medication requests');
  }

  const requestsRef = collection(db, MEDICATION_REQUESTS_COLLECTION);
  
  let q = query(requestsRef, where('userId', '==', targetUserId));

  if (status) {
    q = query(q, where('status', '==', status));
  }

  q = query(q, orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => medicationRequestConverter.fromFirestore(doc));
}

/**
 * Update a MedicationRequest
 * 
 * @param requestId - MedicationRequest document ID
 * @param updates - Partial medication request data to update
 * @returns Promise with updated MedicationRequestDocument
 */
export async function updateMedicationRequest(
  requestId: string,
  updates: UpdateMedicationRequestData
): Promise<MedicationRequestDocument> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to update a medication request');
  }

  const requestRef = doc(db, MEDICATION_REQUESTS_COLLECTION, requestId);
  const snapshot = await getDoc(requestRef);

  if (!snapshot.exists()) {
    throw new Error('MedicationRequest not found');
  }

  const existingRequest = medicationRequestConverter.fromFirestore(snapshot);

  // Verify ownership
  if (existingRequest.userId !== userId) {
    throw new Error('User does not have permission to update this medication request');
  }

  // Build update object
  const updateData: Partial<MedicationRequestDocument> = {
    ...existingRequest,
  };

  if (updates.medicationName !== undefined) {
    updateData.medicationName = updates.medicationName;
    updateData.medicationCodeableConcept = {
      text: updates.medicationName,
      coding: [
        {
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          display: updates.medicationName,
        },
      ],
    };
  }

  if (updates.dosageInstruction !== undefined) {
    updateData.dosageInstruction = updates.dosageInstruction;
  }

  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }

  if (updates.isPRN !== undefined) {
    updateData.isPRN = updates.isPRN;
  }

  if (updates.priority !== undefined) {
    updateData.priority = updates.priority;
  }

  // Increment version
  if (updateData.meta?.versionId) {
    const currentVersion = parseInt(updateData.meta.versionId, 10);
    updateData.meta.versionId = (currentVersion + 1).toString();
  }

  const firestoreData = medicationRequestConverter.toFirestore(
    updateData as MedicationRequestDocument
  );
  await updateDoc(requestRef, firestoreData);

  const updatedSnapshot = await getDoc(requestRef);
  return medicationRequestConverter.fromFirestore(updatedSnapshot);
}

/**
 * Delete a MedicationRequest (sets status to 'cancelled')
 * 
 * @param requestId - MedicationRequest document ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteMedicationRequest(requestId: string): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to delete a medication request');
  }

  const requestRef = doc(db, MEDICATION_REQUESTS_COLLECTION, requestId);
  const snapshot = await getDoc(requestRef);

  if (!snapshot.exists()) {
    throw new Error('MedicationRequest not found');
  }

  const existingRequest = medicationRequestConverter.fromFirestore(snapshot);

  // Verify ownership
  if (existingRequest.userId !== userId) {
    throw new Error('User does not have permission to delete this medication request');
  }

  // Soft delete by setting status to cancelled
  await updateDoc(requestRef, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get active medication count for a patient
 * 
 * @param patientId - Patient document ID
 * @returns Promise with count of active medications
 */
export async function getActiveMedicationCount(patientId: string): Promise<number> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get medication count');
  }

  const requestsRef = collection(db, MEDICATION_REQUESTS_COLLECTION);
  const q = query(
    requestsRef,
    where('userId', '==', userId),
    where('patientId', '==', patientId),
    where('status', '==', 'active')
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Check if medication request belongs to the authenticated user
 * 
 * @param requestId - MedicationRequest document ID
 * @param userId - Optional user ID (defaults to current user)
 * @returns Promise with boolean indicating ownership
 */
export async function isMedicationRequestOwnedByUser(
  requestId: string,
  userId?: string
): Promise<boolean> {
  const targetUserId = userId || getCurrentUserId();
  if (!targetUserId) {
    return false;
  }

  const request = await getMedicationRequest(requestId);
  return request?.userId === targetUserId;
}
