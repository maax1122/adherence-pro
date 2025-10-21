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
import type { User } from 'firebase/auth';
import { db } from '@/config/firebase';
import {
  MedicationAdministrationDocument,
  MedicationAdministrationEditHistoryEntry,
  FHIRCodeableConcept,
} from '@/types/fhir';
import { medicationAdministrationConverter } from './converters';
import { getCurrentUser, getCurrentUserId } from '../auth/authService';
import { getMedicationRequest } from './medicationRequestService';
import { canCaregiverLog, canCaregiverView } from './familyConnectionService';
import { getPatient } from './patientService';

const MEDICATION_ADMINISTRATIONS_COLLECTION = 'medication_administrations';
const EDIT_WINDOW_HOURS = 24;
const LATE_THRESHOLD_MINUTES = 10;
const MILLISECONDS_IN_MINUTE = 60 * 1000;

const computeAdministrationStatus = (
  status: LogMedicationData['status'],
  provided: LogMedicationData['administrationStatus'] | undefined,
  scheduledTime: Date | null | undefined,
  actualTime: Date
): 'taken' | 'missed' | 'taken_late' => {
  if (provided) {
    return provided;
  }

  if (status === 'not-done') {
    return 'missed';
  }

  if (status === 'completed') {
    if (scheduledTime) {
      const diffMinutes = (actualTime.getTime() - scheduledTime.getTime()) / MILLISECONDS_IN_MINUTE;
      if (diffMinutes > LATE_THRESHOLD_MINUTES) {
        return 'taken_late';
      }
    }
    return 'taken';
  }

  // Default fall-back for other statuses (on-hold, stopped)
  return status === 'not-done' ? 'missed' : 'taken';
};

const resolveDisplayName = (
  explicit: string | undefined,
  role: 'patient' | 'caregiver',
  user: User | null
): string => {
  const trimmed = explicit?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (user?.displayName) {
    return user.displayName;
  }

  if (user?.email) {
    return user.email;
  }

  return role === 'patient' ? 'Patient' : 'Caregiver';
};

const getAdministrationStatusFromLog = (
  log: MedicationAdministrationDocument
): 'taken' | 'missed' | 'taken_late' => {
  if (log.administrationStatus) {
    return log.administrationStatus;
  }

  const scheduledDate = log.scheduledTime
    ? typeof (log.scheduledTime as Timestamp).toDate === 'function'
      ? (log.scheduledTime as Timestamp).toDate()
      : null
    : null;
  const effectiveDate = (log.effectiveDateTime as Timestamp).toDate();

  return computeAdministrationStatus(
    log.status as LogMedicationData['status'],
    undefined,
    scheduledDate,
    effectiveDate
  );
};

// ============================================================================
// Types
// ============================================================================

export interface LogMedicationData {
  medicationRequestId: string;
  status: 'completed' | 'not-done' | 'on-hold' | 'stopped';
  effectiveDateTime?: Date;
  performerUserId?: string; // For caregiver logging
  performerRole?: 'patient' | 'caregiver';
  performerDisplayName?: string;
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
  administrationStatus?: 'taken' | 'missed' | 'taken_late';
  scheduledTime?: Date;
}

export interface UpdateMedicationAdministrationData {
  status?: 'completed' | 'not-done' | 'on-hold' | 'stopped';
  reasonCode?: string;
  note?: string;
  administrationStatus?: 'taken' | 'missed' | 'taken_late';
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
  const currentUser = getCurrentUser();
  if (!userId) {
    throw new Error('User must be authenticated to log medication');
  }

  if (data.performerUserId && data.performerUserId !== userId) {
    throw new Error('Performer user mismatch for medication log');
  }

  // Get medication request to verify ownership and get details
  const medRequest = await getMedicationRequest(data.medicationRequestId);
  if (!medRequest) {
    throw new Error('MedicationRequest not found');
  }

  const performerUserId = data.performerUserId || userId;
  let performerRole: 'patient' | 'caregiver' =
    medRequest.userId === performerUserId ? 'patient' : 'caregiver';

  if (performerRole === 'caregiver') {
    const canLogForPatient = await canCaregiverLog(performerUserId, medRequest.patientId);
    if (!canLogForPatient) {
      throw new Error('User does not have permission to log this medication');
    }
  }

  if (data.performerRole && data.performerRole !== performerRole) {
    performerRole = data.performerRole;
  }

  // Validate effectiveDateTime <= now
  const effectiveDateTime = data.effectiveDateTime || new Date();
  const now = new Date();
  if (effectiveDateTime > now) {
    throw new Error('effectiveDateTime cannot be in the future');
  }

  const scheduledDate = data.scheduledTime ?? null;
  const administrationStatus = computeAdministrationStatus(
    data.status,
    data.administrationStatus,
    scheduledDate,
    effectiveDateTime
  );

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

  const performerDisplayName = resolveDisplayName(
    data.performerDisplayName,
    performerRole,
    currentUser
  );

  const actualTimestamp = Timestamp.fromDate(effectiveDateTime);
  const scheduledTimestamp = scheduledDate ? Timestamp.fromDate(scheduledDate) : null;

  const medicationAdmin: MedicationAdministrationDocument = {
    resourceType: 'MedicationAdministration',
    id: adminRef.id,
    userId: medRequest.userId,
    patientId: medRequest.patientId,
    medicationRequestId: data.medicationRequestId,
    status: data.status,
    administrationStatus,
    statusReason: reasonCode,
    subject: {
      reference: `Patient/${medRequest.patientId}`,
    },
    medicationCodeableConcept: medRequest.medicationCodeableConcept,
    effectiveDateTime: actualTimestamp,
    performer: [
      {
        actor: {
          reference: `User/${performerUserId}`,
          display: performerDisplayName,
        },
        onBehalfOf: {
          reference: `Patient/${medRequest.patientId}`,
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
            authorReference: {
              reference: `User/${performerUserId}`,
            },
          },
        ]
      : undefined,
    isPRN: medRequest.isPRN ?? false,
    reminderInstanceId: data.reminderInstanceId,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/MedicationAdministration'],
      versionId: '1',
    },
    scheduledTime: scheduledTimestamp,
    actualTime: actualTimestamp,
    performedBy: performerUserId,
    performedByRole: performerRole,
    performedByName: performerDisplayName,
    isEdited: false,
    editHistory: [],
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

  const medRequest = await getMedicationRequest(medicationRequestId);
  if (!medRequest) {
    throw new Error('MedicationRequest not found');
  }

  const ownerUserId = medRequest.userId;
  const ownsRequest = ownerUserId === userId;

  if (!ownsRequest) {
    const canView = await canCaregiverView(userId, medRequest.patientId);
    if (!canView) {
      throw new Error('User does not have permission to view this medication history');
    }
  }

  const adminsRef = collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION);
  
  let q = query(
    adminsRef,
    where('userId', '==', ownerUserId),
    where('patientId', '==', medRequest.patientId),
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

  const patient = await getPatient(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  const ownerUserId = patient.userId;
  const ownsPatient = ownerUserId === userId;

  if (!ownsPatient) {
    const canView = await canCaregiverView(userId, patientId);
    if (!canView) {
      throw new Error('User does not have permission to view this patient');
    }
  }

  const adminsRef = collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION);
  
  let q = query(
    adminsRef,
    where('userId', '==', ownerUserId),
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
  const currentUser = getCurrentUser();
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
  const isOwner = existingAdmin.userId === userId;
  const isPerformer = existingAdmin.performedBy === userId;

  if (!isOwner) {
    if (!isPerformer) {
      throw new Error('User does not have permission to update this medication administration');
    }

    const canLogForPatient = await canCaregiverLog(userId, existingAdmin.patientId);
    if (!canLogForPatient) {
      throw new Error('User does not have permission to update this medication administration');
    }
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

  let hasMeaningfulChange = false;
  const scheduledDate = existingAdmin.scheduledTime
    ? existingAdmin.scheduledTime.toDate()
    : undefined;
  const previousStatus = existingAdmin.administrationStatus
    ? existingAdmin.administrationStatus
    : computeAdministrationStatus(
        existingAdmin.status as LogMedicationData['status'],
        undefined,
        scheduledDate ?? null,
        (existingAdmin.effectiveDateTime as Timestamp).toDate()
      );

  if (updates.status !== undefined) {
    if (updates.status !== existingAdmin.status) {
      hasMeaningfulChange = true;
      updateData.status = updates.status;
    }
  }

  if (updates.reasonCode !== undefined) {
    hasMeaningfulChange = true;
    if (updates.reasonCode) {
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
    } else {
      updateData.statusReason = undefined;
    }
  }

  if (updates.note !== undefined) {
    const existingNotes = updateData.note || [];
    updateData.note = [
      ...existingNotes,
      {
        text: updates.note,
        time: new Date().toISOString(),
        authorReference: {
          reference: `User/${userId}`,
        },
      },
    ];
    hasMeaningfulChange = true;
  }

  if (updates.administrationStatus !== undefined) {
    if (updates.administrationStatus !== existingAdmin.administrationStatus) {
      updateData.administrationStatus = updates.administrationStatus;
      hasMeaningfulChange = true;
    }
  } else if (updates.status !== undefined) {
    updateData.administrationStatus = computeAdministrationStatus(
      updates.status,
      undefined,
      scheduledDate ?? null,
      (existingAdmin.effectiveDateTime as Timestamp).toDate()
    );
  }

  // Increment version
  if (updateData.meta?.versionId) {
    const currentVersion = parseInt(updateData.meta.versionId, 10);
    updateData.meta.versionId = (currentVersion + 1).toString();
  }

  if (hasMeaningfulChange) {
    updateData.isEdited = true;
    const historyEntry: MedicationAdministrationEditHistoryEntry = {
      editedAt: Timestamp.now(),
      previousStatus,
      editedBy: userId,
      editedByName: resolveDisplayName(undefined, isOwner ? 'patient' : 'caregiver', currentUser),
    };

    const existingHistory = existingAdmin.editHistory || [];
    updateData.editHistory = [...existingHistory, historyEntry];
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

  const totalTaken = logs.filter((log) => {
    const status = getAdministrationStatusFromLog(log);
    return status === 'taken' || status === 'taken_late';
  }).length;
  const totalMissed = logs.filter((log) => getAdministrationStatusFromLog(log) === 'missed').length;
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
  return logs.filter((log) => getAdministrationStatusFromLog(log) === 'missed');
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
  if (!admin) {
    return false;
  }

  if (admin.userId === targetUserId) {
    return true;
  }

  if (admin.performedBy === targetUserId) {
    return canCaregiverLog(targetUserId, admin.patientId);
  }

  return false;
}

/**
 * Get medication log count for a patient
 */
export async function getMedicationLogCount(patientId: string): Promise<number> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get medication log count');
  }

  const patient = await getPatient(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  const ownerUserId = patient.userId;
  const ownsPatient = ownerUserId === userId;

  if (!ownsPatient) {
    const canView = await canCaregiverView(userId, patientId);
    if (!canView) {
      throw new Error('User does not have permission to view this patient');
    }
  }

  const adminsRef = collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION);
  const q = query(
    adminsRef,
    where('userId', '==', ownerUserId),
    where('patientId', '==', patientId)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}
