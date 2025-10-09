/**
 * Patient Service (FHIR Patient CRUD) - Web
 * 
 * Manages FHIR Patient resources in Firestore.
 * Implements create, read, update, delete operations.
 * 
 * Collection path: /patients/{patientId}
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
import { PatientDocument, FHIRHumanName } from '@/types/fhir';
import { patientConverter } from './converters';
import { getCurrentUserId } from '../auth/authService';

const PATIENTS_COLLECTION = 'patients';

// ============================================================================
// Types
// ============================================================================

export interface CreatePatientData {
  name: string; // Display name (e.g., "Mom", "John Doe")
  birthDate?: string; // YYYY-MM-DD
  gender?: 'male' | 'female' | 'other' | 'unknown';
  relationship?: 'self' | 'parent' | 'child' | 'spouse' | 'sibling' | 'grandparent' | 'grandchild' | 'other';
  photoUrl?: string; // Firebase Storage URL
}

export interface UpdatePatientData {
  name?: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  relationship?: 'self' | 'parent' | 'child' | 'spouse' | 'sibling' | 'grandparent' | 'grandchild' | 'other';
  photoUrl?: string;
  active?: boolean;
}

// ============================================================================
// Patient Service
// ============================================================================

/**
 * Create a new Patient resource
 * 
 * @param data - Patient creation data
 * @returns Promise with created PatientDocument
 * 
 * @example
 * ```ts
 * const patient = await createPatient({
 *   name: 'John Doe',
 *   birthDate: '1990-05-15',
 *   gender: 'male',
 *   relationship: 'self'
 * });
 * console.log('Patient created:', patient.id);
 * ```
 */
export async function createPatient(data: CreatePatientData): Promise<PatientDocument> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to create a patient');
  }

  const patientRef = doc(collection(db, PATIENTS_COLLECTION));

  const humanName: FHIRHumanName = {
    use: 'usual',
    text: data.name,
  };

  const patient: PatientDocument = {
    resourceType: 'Patient',
    id: patientRef.id,
    userId: userId,
    active: true,
    name: [humanName],
    birthDate: data.birthDate,
    gender: data.gender,
    relationship: data.relationship || 'self',
    photo: data.photoUrl
      ? [
          {
            contentType: 'image/jpeg',
            url: data.photoUrl,
          },
        ]
      : undefined,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Patient'],
      versionId: '1',
    },
    extension: [
      {
        url: 'http://adherence-pro.app/fhir/StructureDefinition/firebase-user-id',
        valueString: userId,
      },
      {
        url: 'http://adherence-pro.app/fhir/StructureDefinition/profile-role',
        valueCode: data.relationship || 'self',
      },
    ],
  };

  const firestoreData = patientConverter.toFirestore(patient);
  await setDoc(patientRef, firestoreData);

  const snapshot = await getDoc(patientRef);
  return patientConverter.fromFirestore(snapshot);
}

/**
 * Get a Patient by ID
 * 
 * @param patientId - Patient document ID
 * @returns Promise with PatientDocument or null if not found
 * 
 * @example
 * ```ts
 * const patient = await getPatient('patient123');
 * if (patient) {
 *   console.log('Patient name:', patient.name?.[0]?.text);
 * }
 * ```
 */
export async function getPatient(patientId: string): Promise<PatientDocument | null> {
  const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
  const snapshot = await getDoc(patientRef);

  if (!snapshot.exists()) {
    return null;
  }

  return patientConverter.fromFirestore(snapshot);
}

/**
 * Get all Patients for a user
 * 
 * @param userId - Optional user ID (defaults to current user)
 * @returns Promise with array of PatientDocuments
 * 
 * @example
 * ```ts
 * const patients = await getUserPatients();
 * console.log(`Found ${patients.length} patients`);
 * patients.forEach(p => console.log(p.name?.[0]?.text));
 * ```
 */
export async function getUserPatients(userId?: string): Promise<PatientDocument[]> {
  const targetUserId = userId || getCurrentUserId();
  if (!targetUserId) {
    throw new Error('User must be authenticated to get patients');
  }

  const patientsRef = collection(db, PATIENTS_COLLECTION);
  const q = query(
    patientsRef,
    where('userId', '==', targetUserId),
    where('active', '==', true),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => patientConverter.fromFirestore(doc));
}

/**
 * Update a Patient
 * 
 * @param patientId - Patient document ID
 * @param updates - Partial patient data to update
 * @returns Promise with updated PatientDocument
 * 
 * @example
 * ```ts
 * const updated = await updatePatient('patient123', {
 *   name: 'Jane Doe',
 *   gender: 'female'
 * });
 * console.log('Patient updated:', updated.id);
 * ```
 */
export async function updatePatient(
  patientId: string,
  updates: UpdatePatientData
): Promise<PatientDocument> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to update a patient');
  }

  const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
  const snapshot = await getDoc(patientRef);

  if (!snapshot.exists()) {
    throw new Error('Patient not found');
  }

  const existingPatient = patientConverter.fromFirestore(snapshot);

  // Verify ownership
  if (existingPatient.userId !== userId) {
    throw new Error('User does not have permission to update this patient');
  }

  // Build update object
  const updateData: Partial<PatientDocument> = {
    ...existingPatient,
  };

  if (updates.name !== undefined) {
    updateData.name = [
      {
        use: 'usual',
        text: updates.name,
      },
    ];
  }

  if (updates.birthDate !== undefined) {
    updateData.birthDate = updates.birthDate;
  }

  if (updates.gender !== undefined) {
    updateData.gender = updates.gender;
  }

  if (updates.relationship !== undefined) {
    updateData.relationship = updates.relationship;
  }

  if (updates.photoUrl !== undefined) {
    updateData.photo = [
      {
        contentType: 'image/jpeg',
        url: updates.photoUrl,
      },
    ];
  }

  if (updates.active !== undefined) {
    updateData.active = updates.active;
  }

  // Increment version
  if (updateData.meta?.versionId) {
    const currentVersion = parseInt(updateData.meta.versionId, 10);
    updateData.meta.versionId = (currentVersion + 1).toString();
  }

  const firestoreData = patientConverter.toFirestore(updateData as PatientDocument);
  await updateDoc(patientRef, firestoreData);

  const updatedSnapshot = await getDoc(patientRef);
  return patientConverter.fromFirestore(updatedSnapshot);
}

/**
 * Delete a Patient (soft delete by setting active: false)
 * 
 * @param patientId - Patient document ID
 * @returns Promise that resolves when deletion is complete
 * 
 * @example
 * ```ts
 * await deletePatient('patient123');
 * console.log('Patient deleted');
 * ```
 */
export async function deletePatient(patientId: string): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to delete a patient');
  }

  const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
  const snapshot = await getDoc(patientRef);

  if (!snapshot.exists()) {
    throw new Error('Patient not found');
  }

  const existingPatient = patientConverter.fromFirestore(snapshot);

  // Verify ownership
  if (existingPatient.userId !== userId) {
    throw new Error('User does not have permission to delete this patient');
  }

  // Soft delete
  await updateDoc(patientRef, {
    active: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check if a patient belongs to the authenticated user
 * 
 * @param patientId - Patient document ID
 * @param userId - Optional user ID (defaults to current user)
 * @returns Promise with boolean indicating ownership
 * 
 * @example
 * ```ts
 * const isOwner = await isPatientOwnedByUser('patient123');
 * if (isOwner) {
 *   console.log('User owns this patient');
 * }
 * ```
 */
export async function isPatientOwnedByUser(
  patientId: string,
  userId?: string
): Promise<boolean> {
  const targetUserId = userId || getCurrentUserId();
  if (!targetUserId) {
    return false;
  }

  const patient = await getPatient(patientId);
  return patient?.userId === targetUserId;
}

/**
 * Get active patient count for a user
 * 
 * @param userId - Optional user ID (defaults to current user)
 * @returns Promise with count of active patients
 * 
 * @example
 * ```ts
 * const count = await getActivePatientCount();
 * console.log(`You have ${count} active patients`);
 * ```
 */
export async function getActivePatientCount(userId?: string): Promise<number> {
  const targetUserId = userId || getCurrentUserId();
  if (!targetUserId) {
    throw new Error('User must be authenticated to get patient count');
  }

  const patientsRef = collection(db, PATIENTS_COLLECTION);
  const q = query(
    patientsRef,
    where('userId', '==', targetUserId),
    where('active', '==', true)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}
