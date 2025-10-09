/**
 * MedicationAdministration Service (FHIR MedicationAdministration CRUD) - Web
 * 
 * Manages FHIR MedicationAdministration resources in Firestore.
 * Implements create, read, update operations for medication dose logging.
 * 
 * Collection path: /medication_administrations/{adminId}
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
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  MedicationAdministrationDocument,
  FHIRCodeableConcept,
} from '@/types/fhir';
import { medicationAdministrationConverter } from './converters';
import { getCurrentUserId } from '../auth/authService';
import { getMedicationRequest } from './medicationRequestService';

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
  reminderInstanceId?: string;
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

export interface AdherenceStats {
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  adherenceRate: number; // 0-100
}

// ============================================================================
// MedicationAdministration Service
// ============================================================================

/**
 * Log a medication dose (create MedicationAdministration)
 * 
 * @param data - Medication administration data
 * @returns Promise with created MedicationAdministrationDocument
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

  // Verify user has permission
  const performerUserId = data.performerUserId || userId;
  const isOwner = medRequest.userId === performerUserId;
  
  if (!isOwner) {
    // Note: Caregiver permission check would go here
    // For now, only allow owner to log
    throw new Error('User does not have permission to log this medication');
  }

  // Validate effectiveDateTime <= now
  const effectiveDateTime = data.effectiveDateTime || new Date();
  const now = new Date();
  if (effectiveDateTime > now) {
    throw new Error('effectiveDateTime cannot be in the future');
  }

  const adminRef = doc(collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION));

  // Build reason codeable concept if not-done
  let reasonCode: FHIRCodeableConcept[] | undefined;
  if (data.status === 'not-done' && data.reasonCode) {
    reasonCode = [
      {
        text: data.reasonCode,
        coding: [
          {
            system: 'http://adherence-pro.app/CodeSystem/not-done-reason',
            code: data.reasonCode.toLowerCase().replace(/\s+/g, '-'),
            display: data.reasonCode,
          },
        ],
      },
    ];
  }

  const medicationAdmin: MedicationAdministrationDocument = {
    resourceType: 'MedicationAdministration',
    id: adminRef.id,
    userId: medRequest.userId,
    patientId: medRequest.patientId,
    medicationRequestId: data.medicationRequestId,
    status: data.status,
    statusReason: reasonCode,
    subject: {
      reference: `Patient/${medRequest.patientId}`,
    },
    medicationCodeableConcept: medRequest.medicationCodeableConcept,
    effectiveDateTime: Timestamp.fromDate(effectiveDateTime),
    performer: [
      {
        actor: {
          reference: `User/${performerUserId}`,
          display: data.performerRole || 'patient',
        },
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
    isPRN: medRequest.isPRN ?? false,
    reminderInstanceId: data.reminderInstanceId,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/MedicationAdministration'],
      versionId: '1',
    },
  };

  const firestoreData = medicationAdministrationConverter.toFirestore(medicationAdmin);
  await setDoc(adminRef, firestoreData);

  const snapshot = await getDoc(adminRef);
  return medicationAdministrationConverter.fromFirestore(snapshot);
}

/**
 * Get a MedicationAdministration by ID
 */
export async function getMedicationAdministration(
  adminId: string
): Promise<MedicationAdministrationDocument | null> {
  const adminRef = doc(db, MEDICATION_ADMINISTRATIONS_COLLECTION, adminId);
  const snapshot = await getDoc(adminRef);

  if (!snapshot.exists()) {
    return null;
  }

  return medicationAdministrationConverter.fromFirestore(snapshot);
}

/**
 * Get medication logs for a specific medication request
 */
export async function getMedicationLogs(
  medicationRequestId: string,
  dateRange?: DateRange
): Promise<MedicationAdministrationDocument[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get medication logs');
  }

  const adminsRef = collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION);
  
  let q = query(
    adminsRef,
    where('userId', '==', userId),
    where('medicationRequestId', '==', medicationRequestId)
  );

  if (dateRange) {
    const startDate = Timestamp.fromDate(new Date(dateRange.start));
    const endDate = Timestamp.fromDate(new Date(dateRange.end));
    q = query(q, where('effectiveDateTime', '>=', startDate));
    q = query(q, where('effectiveDateTime', '<=', endDate));
  }

  q = query(q, orderBy('effectiveDateTime', 'desc'));

  const snapshot = await getDocs(q);
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

  const adminsRef = collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION);
  
  let q = query(
    adminsRef,
    where('userId', '==', userId),
    where('patientId', '==', patientId)
  );

  if (dateRange) {
    const startDate = Timestamp.fromDate(new Date(dateRange.start));
    const endDate = Timestamp.fromDate(new Date(dateRange.end));
    q = query(q, where('effectiveDateTime', '>=', startDate));
    q = query(q, where('effectiveDateTime', '<=', endDate));
  }

  q = query(q, orderBy('effectiveDateTime', 'desc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => medicationAdministrationConverter.fromFirestore(doc));
}

/**
 * Update a MedicationAdministration (24-hour edit window)
 */
export async function updateMedicationAdministration(
  adminId: string,
  updates: UpdateMedicationAdministrationData
): Promise<MedicationAdministrationDocument> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to update medication administration');
  }

  const adminRef = doc(db, MEDICATION_ADMINISTRATIONS_COLLECTION, adminId);
  const snapshot = await getDoc(adminRef);

  if (!snapshot.exists()) {
    throw new Error('MedicationAdministration not found');
  }

  const existingAdmin = medicationAdministrationConverter.fromFirestore(snapshot);

  // Verify ownership
  if (existingAdmin.userId !== userId) {
    throw new Error('User does not have permission to update this medication administration');
  }

  // Enforce 24-hour edit window
  const effectiveDate = existingAdmin.effectiveDateTime as Timestamp;
  const now = Timestamp.now();
  const hoursSinceLog = (now.toMillis() - effectiveDate.toMillis()) / (1000 * 60 * 60);

  if (hoursSinceLog > EDIT_WINDOW_HOURS) {
    throw new Error(
      `Cannot edit medication log after ${EDIT_WINDOW_HOURS} hours. Log was ${Math.floor(
        hoursSinceLog
      )} hours ago.`
    );
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
            system: 'http://adherence-pro.app/CodeSystem/not-done-reason',
            code: updates.reasonCode.toLowerCase().replace(/\s+/g, '-'),
            display: updates.reasonCode,
          },
        ],
      },
    ];
  }

  if (updates.note !== undefined) {
    const existingNotes = updateData.note || [];
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
  await updateDoc(adminRef, firestoreData);

  const updatedSnapshot = await getDoc(adminRef);
  return medicationAdministrationConverter.fromFirestore(updatedSnapshot);
}

/**
 * Calculate adherence statistics for a medication request
 */
export async function calculateAdherence(
  medicationRequestId: string,
  dateRange: DateRange
): Promise<AdherenceStats> {
  const logs = await getMedicationLogs(medicationRequestId, dateRange);

  const totalTaken = logs.filter((log) => log.status === 'completed').length;
  const totalMissed = logs.filter((log) => log.status === 'not-done').length;
  const totalScheduled = totalTaken + totalMissed;

  const adherenceRate = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;

  return {
    totalScheduled,
    totalTaken,
    totalMissed,
    adherenceRate: Math.round(adherenceRate * 10) / 10, // Round to 1 decimal
  };
}

/**
 * Get missed doses (not-done status)
 */
export async function getMissedDoses(
  medicationRequestId: string,
  dateRange?: DateRange
): Promise<MedicationAdministrationDocument[]> {
  const logs = await getMedicationLogs(medicationRequestId, dateRange);
  return logs.filter((log) => log.status === 'not-done');
}

/**
 * Check if medication administration belongs to the authenticated user
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
export async function getMedicationLogCount(patientId: string): Promise<number> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get medication log count');
  }

  const adminsRef = collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION);
  const q = query(
    adminsRef,
    where('userId', '==', userId),
    where('patientId', '==', patientId)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}
