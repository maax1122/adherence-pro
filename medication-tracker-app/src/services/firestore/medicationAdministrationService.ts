/**
 * MedicationAdministration Service (FHIR MedicationAdministration CRUD)
 * 
 * Manages FHIR MedicationAdministration resources in Firestore.
 * Implements create, read, update operations for medication dose logging.
 * 
 * Collection path: /medication_administrations/{adminId}
 * 
 * Security: All operations require userId match with authenticated user
 */

import firestore from '@react-native-firebase/firestore';
import {
  MedicationAdministrationDocument,
  FHIRCodeableConcept,
  FHIRReference,
} from '../../types/fhir';
import { medicationAdministrationConverter } from './converters';
import { getCurrentUserId } from '../auth/authService';
import { getMedicationRequest, isMedicationRequestOwnedByUser } from './medicationRequestService';
import { isPatientOwnedByUser } from './patientService';

const MEDICATION_ADMINISTRATIONS_COLLECTION = 'medication_administrations';
const EDIT_WINDOW_HOURS = 24;

// ============================================================================
// Types
// ============================================================================

export interface LogMedicationData {
  medicationRequestId: string;
  status: 'completed' | 'not-done' | 'on-hold' | 'stopped';
  effectiveDateTime?: Date;
  performerUserId?: string; // For caregiver logging
  performerRole?: 'patient' | 'caregiver' | 'family_member';
  reasonCode?: string; // Why not-done (e.g., "Forgot", "Side effects")
  note?: string;
  dosage?: {
    text?: string;
    dose?: {
      value?: number;
      unit?: string;
    };
  };
  reminderInstanceId?: string; // Link to ReminderSchedule instance
}

export interface UpdateMedicationAdministrationData {
  status?: 'completed' | 'not-done' | 'on-hold' | 'stopped';
  reasonCode?: string;
  note?: string;
}

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

// ============================================================================
// MedicationAdministration Service
// ============================================================================

/**
 * Log a medication dose (create MedicationAdministration)
 */
export async function logMedication(
  data: LogMedicationData
): Promise<MedicationAdministrationDocument> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to log medication');
  }

  // Get medication request to verify ownership and get details
  const medRequest = await getMedicationRequest(data.medicationRequestId);
  if (!medRequest) {
    throw new Error('MedicationRequest not found');
  }

  // Verify user has permission to log for this medication
  const performerUserId = data.performerUserId || userId;
  const isOwner = medRequest.userId === performerUserId;
  
  if (!isOwner) {
    // Check if performer is a caregiver with can_log permission
    // This will be fully implemented when FamilyConnection service is ready (T023)
    throw new Error('User does not have permission to log this medication');
  }

  // Validate effectiveDateTime <= now
  const effectiveDateTime = data.effectiveDateTime || new Date();
  const now = new Date();
  if (effectiveDateTime > now) {
    throw new Error('effectiveDateTime cannot be in the future');
  }

  const adminRef = firestore().collection(MEDICATION_ADMINISTRATIONS_COLLECTION).doc();

  // Build status reason if provided
  const statusReason: FHIRCodeableConcept[] | undefined = data.reasonCode
    ? [
        {
          text: data.reasonCode,
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/reason-medication-not-given',
              display: data.reasonCode,
            },
          ],
        },
      ]
    : undefined;

  // Build performer reference
  const performerReference: FHIRReference = {
    reference: `User/${performerUserId}`,
    display: data.performerRole === 'caregiver' ? 'Caregiver' : 'Patient',
  };

  const medicationAdmin: MedicationAdministrationDocument = {
    resourceType: 'MedicationAdministration',
    id: adminRef.id,
    userId: medRequest.userId,
    patientId: medRequest.patientId,
    medicationRequestId: data.medicationRequestId,
    status: data.status,
    statusReason,
    subject: medRequest.subject,
    medicationCodeableConcept: medRequest.medicationCodeableConcept,
    effectiveDateTime: firestore.Timestamp.fromDate(effectiveDateTime) as any,
    performer: [
      {
        function: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/med-admin-perform-function',
              code: data.performerRole === 'caregiver' ? 'performer' : 'witness',
              display: data.performerRole === 'caregiver' ? 'Performer' : 'Witness',
            },
          ],
        },
        actor: performerReference,
      },
    ],
    request: {
      reference: `MedicationRequest/${data.medicationRequestId}`,
    },
    dosage: data.dosage,
    note: data.note
      ? [
          {
            text: data.note,
            time: new Date().toISOString(),
          },
        ]
      : undefined,
    isPRN: medRequest.isPRN,
    reminderInstanceId: data.reminderInstanceId,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/MedicationAdministration'],
      versionId: '1',
    },
  };

  const firestoreData = medicationAdministrationConverter.toFirestore(medicationAdmin);
  await adminRef.set(firestoreData);

  const snapshot = await adminRef.get();
  return medicationAdministrationConverter.fromFirestore(snapshot);
}

/**
 * Get a MedicationAdministration by ID
 */
export async function getMedicationAdministration(
  adminId: string
): Promise<MedicationAdministrationDocument | null> {
  const snapshot = await firestore()
    .collection(MEDICATION_ADMINISTRATIONS_COLLECTION)
    .doc(adminId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return medicationAdministrationConverter.fromFirestore(snapshot);
}

/**
 * Get all medication logs for a MedicationRequest
 */
export async function getMedicationLogs(
  medicationRequestId: string,
  dateRange?: DateRange
): Promise<MedicationAdministrationDocument[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get medication logs');
  }

  // Verify user owns this medication request
  const hasPermission = await isMedicationRequestOwnedByUser(medicationRequestId, userId);
  if (!hasPermission) {
    throw new Error('User does not have permission to view these logs');
  }

  let query = firestore()
    .collection(MEDICATION_ADMINISTRATIONS_COLLECTION)
    .where('medicationRequestId', '==', medicationRequestId);

  if (dateRange) {
    const startDate = firestore.Timestamp.fromDate(new Date(dateRange.start));
    const endDate = firestore.Timestamp.fromDate(new Date(dateRange.end + 'T23:59:59'));
    query = query
      .where('effectiveDateTime', '>=', startDate)
      .where('effectiveDateTime', '<=', endDate);
  }

  const snapshot = await query.orderBy('effectiveDateTime', 'desc').get();

  return snapshot.docs.map((doc) => medicationAdministrationConverter.fromFirestore(doc));
}

/**
 * Get all medication logs for a patient
 */
export async function getPatientMedicationLogs(
  patientId: string,
  dateRange?: DateRange
): Promise<MedicationAdministrationDocument[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get medication logs');
  }

  // Verify user owns this patient
  const hasPermission = await isPatientOwnedByUser(patientId, userId);
  if (!hasPermission) {
    throw new Error('User does not have permission to view these logs');
  }

  let query = firestore()
    .collection(MEDICATION_ADMINISTRATIONS_COLLECTION)
    .where('userId', '==', userId)
    .where('patientId', '==', patientId);

  if (dateRange) {
    const startDate = firestore.Timestamp.fromDate(new Date(dateRange.start));
    const endDate = firestore.Timestamp.fromDate(new Date(dateRange.end + 'T23:59:59'));
    query = query
      .where('effectiveDateTime', '>=', startDate)
      .where('effectiveDateTime', '<=', endDate);
  }

  const snapshot = await query.orderBy('effectiveDateTime', 'desc').get();

  return snapshot.docs.map((doc) => medicationAdministrationConverter.fromFirestore(doc));
}

/**
 * Update a MedicationAdministration (within 24-hour window)
 */
export async function updateMedicationAdministration(
  adminId: string,
  updates: UpdateMedicationAdministrationData
): Promise<MedicationAdministrationDocument> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to update medication log');
  }

  const adminRef = firestore().collection(MEDICATION_ADMINISTRATIONS_COLLECTION).doc(adminId);
  const snapshot = await adminRef.get();

  if (!snapshot.exists) {
    throw new Error('MedicationAdministration not found');
  }

  const existingAdmin = medicationAdministrationConverter.fromFirestore(snapshot);

  // Verify ownership
  if (existingAdmin.userId !== userId) {
    throw new Error('User does not have permission to update this log');
  }

  // Verify 24-hour edit window
  const effectiveDateTime =
    existingAdmin.effectiveDateTime instanceof firestore.Timestamp
      ? existingAdmin.effectiveDateTime.toDate()
      : new Date(existingAdmin.effectiveDateTime as string);
  const hoursSinceLog = (Date.now() - effectiveDateTime.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLog > EDIT_WINDOW_HOURS) {
    throw new Error('Cannot edit medication log after 24 hours');
  }

  // Build update object
  const updateData: Partial<MedicationAdministrationDocument> = {
    ...existingAdmin,
  };

  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }

  if (updates.reasonCode !== undefined) {
    updateData.statusReason = [
      {
        text: updates.reasonCode,
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/reason-medication-not-given',
            display: updates.reasonCode,
          },
        ],
      },
    ];
  }

  if (updates.note !== undefined) {
    const existingNotes = existingAdmin.note || [];
    updateData.note = [
      ...existingNotes,
      {
        text: updates.note,
        time: new Date().toISOString(),
      },
    ];
  }

  // Increment version
  if (updateData.meta?.versionId) {
    const currentVersion = parseInt(updateData.meta.versionId, 10);
    updateData.meta.versionId = (currentVersion + 1).toString();
  }

  const firestoreData = medicationAdministrationConverter.toFirestore(
    updateData as MedicationAdministrationDocument
  );
  await adminRef.update(firestoreData);

  const updatedSnapshot = await adminRef.get();
  return medicationAdministrationConverter.fromFirestore(updatedSnapshot);
}

/**
 * Calculate adherence percentage for a MedicationRequest
 */
export async function calculateAdherence(
  medicationRequestId: string,
  dateRange?: DateRange
): Promise<{
  taken: number;
  scheduled: number;
  percentage: number;
}> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to calculate adherence');
  }

  // Get medication request to check if PRN
  const medRequest = await getMedicationRequest(medicationRequestId);
  if (!medRequest) {
    throw new Error('MedicationRequest not found');
  }

  if (medRequest.isPRN) {
    throw new Error('Cannot calculate adherence for PRN medications');
  }

  // Get logs
  const logs = await getMedicationLogs(medicationRequestId, dateRange);
  const takenCount = logs.filter((log) => log.status === 'completed').length;

  // TODO: Get scheduled count from ReminderSchedule (T022)
  // For now, return 0 scheduled
  const scheduledCount = 0;

  const percentage = scheduledCount > 0 ? (takenCount / scheduledCount) * 100 : 0;

  return {
    taken: takenCount,
    scheduled: scheduledCount,
    percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
  };
}

/**
 * Get missed doses for a patient (requires ReminderSchedule - T022)
 */
export async function getMissedDoses(
  patientId: string,
  _dateRange?: DateRange
): Promise<MedicationAdministrationDocument[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get missed doses');
  }

  // Verify user owns this patient
  const hasPermission = await isPatientOwnedByUser(patientId, userId);
  if (!hasPermission) {
    throw new Error('User does not have permission to view missed doses');
  }

  // TODO: Implement after T022 (ReminderSchedule service)
  // Logic:
  // 1. Get all ReminderSchedule instances for patient in _dateRange
  // 2. Filter instances with status = 'missed'
  // 3. Return corresponding MedicationAdministration docs (status = 'not-done')

  // For now, return empty array
  return [];
}

/**
 * Check if a medication administration belongs to the authenticated user
 */
export async function isMedicationAdministrationOwnedByUser(
  adminId: string,
  userId?: string
): Promise<boolean> {
  const targetUserId = userId || getCurrentUserId();
  if (!targetUserId) {
    return false;
  }

  const admin = await getMedicationAdministration(adminId);
  return admin?.userId === targetUserId;
}

/**
 * Get medication log count for a patient
 */
export async function getMedicationLogCount(
  patientId: string,
  dateRange?: DateRange
): Promise<number> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get log count');
  }

  let query = firestore()
    .collection(MEDICATION_ADMINISTRATIONS_COLLECTION)
    .where('userId', '==', userId)
    .where('patientId', '==', patientId);

  if (dateRange) {
    const startDate = firestore.Timestamp.fromDate(new Date(dateRange.start));
    const endDate = firestore.Timestamp.fromDate(new Date(dateRange.end + 'T23:59:59'));
    query = query
      .where('effectiveDateTime', '>=', startDate)
      .where('effectiveDateTime', '<=', endDate);
  }

  const snapshot = await query.get();
  return snapshot.size;
}
