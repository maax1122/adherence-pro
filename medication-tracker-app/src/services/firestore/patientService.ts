/**
 * Patient Service (FHIR Patient CRUD)
 * 
 * Manages FHIR Patient resources in Firestore.
 * Implements create, read, update, delete operations.
 * 
 * Collection path: /patients/{patientId}
 * 
 * Security: All operations require userId match with authenticated user
 */

import firestore from '@react-native-firebase/firestore';
import { PatientDocument, FHIRHumanName } from '../../types/fhir';
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
 */
export async function createPatient(data: CreatePatientData): Promise<PatientDocument> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to create a patient');
  }

  const patientRef = firestore().collection(PATIENTS_COLLECTION).doc();

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
  await patientRef.set(firestoreData);

  const snapshot = await patientRef.get();
  return patientConverter.fromFirestore(snapshot);
}

/**
 * Get a Patient by ID
 */
export async function getPatient(patientId: string): Promise<PatientDocument | null> {
  const snapshot = await firestore().collection(PATIENTS_COLLECTION).doc(patientId).get();

  if (!snapshot.exists) {
    return null;
  }

  return patientConverter.fromFirestore(snapshot);
}

/**
 * Get all Patients for a user
 */
export async function getUserPatients(userId?: string): Promise<PatientDocument[]> {
  const targetUserId = userId || getCurrentUserId();
  if (!targetUserId) {
    throw new Error('User must be authenticated to get patients');
  }

  const snapshot = await firestore()
    .collection(PATIENTS_COLLECTION)
    .where('userId', '==', targetUserId)
    .where('active', '==', true)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => patientConverter.fromFirestore(doc));
}

/**
 * Update a Patient
 */
export async function updatePatient(
  patientId: string,
  updates: UpdatePatientData
): Promise<PatientDocument> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to update a patient');
  }

  const patientRef = firestore().collection(PATIENTS_COLLECTION).doc(patientId);
  const snapshot = await patientRef.get();

  if (!snapshot.exists) {
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
  await patientRef.update(firestoreData);

  const updatedSnapshot = await patientRef.get();
  return patientConverter.fromFirestore(updatedSnapshot);
}

/**
 * Delete a Patient (soft delete by setting active: false)
 */
export async function deletePatient(patientId: string): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to delete a patient');
  }

  const patientRef = firestore().collection(PATIENTS_COLLECTION).doc(patientId);
  const snapshot = await patientRef.get();

  if (!snapshot.exists) {
    throw new Error('Patient not found');
  }

  const existingPatient = patientConverter.fromFirestore(snapshot);

  // Verify ownership
  if (existingPatient.userId !== userId) {
    throw new Error('User does not have permission to delete this patient');
  }

  // Soft delete
  await patientRef.update({
    active: false,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Check if a patient belongs to the authenticated user
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
 */
export async function getActivePatientCount(userId?: string): Promise<number> {
  const targetUserId = userId || getCurrentUserId();
  if (!targetUserId) {
    throw new Error('User must be authenticated to get patient count');
  }

  const snapshot = await firestore()
    .collection(PATIENTS_COLLECTION)
    .where('userId', '==', targetUserId)
    .where('active', '==', true)
    .get();

  return snapshot.size;
}
