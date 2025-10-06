/**
 * Firestore Data Converters
 * 
 * Converts between FHIR TypeScript interfaces and Firestore documents.
 * Handles:
 * - Timestamp conversions (Firestore Timestamp ↔ ISO 8601 strings)
 * - Denormalization (userId, patientId at top level for queries)
 * - serverTimestamp() for createdAt/updatedAt
 * 
 * @see https://firebase.google.com/docs/reference/js/firestore_.firestoredataconverter
 */

import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {
  PatientDocument,
  MedicationRequestDocument,
  MedicationAdministrationDocument,
  RelatedPersonDocument,
  CareTeamDocument,
  FamilyConnection,
  ReminderSchedule,
} from '../../types/fhir';

type DocumentSnapshot = FirebaseFirestoreTypes.DocumentSnapshot;
type QueryDocumentSnapshot = FirebaseFirestoreTypes.QueryDocumentSnapshot;
type FieldValue = FirebaseFirestoreTypes.FieldValue;

const serverTimestamp = () => firestore.FieldValue.serverTimestamp();

// ============================================================================
// Patient Converter
// ============================================================================

export const patientConverter = {
  toFirestore: (patient: PatientDocument): Record<string, any> => {
    return {
      resourceType: 'Patient',
      id: patient.id,
      userId: patient.userId,
      active: patient.active ?? true,
      name: patient.name || [],
      photo: patient.photo || [],
      birthDate: patient.birthDate || null,
      gender: patient.gender || null,
      relationship: patient.relationship || 'self',
      extension: patient.extension || [],
      meta: {
        ...patient.meta,
        lastUpdated: serverTimestamp() as FieldValue,
      },
      updatedAt: serverTimestamp() as FieldValue,
      createdAt: patient.createdAt || (serverTimestamp() as FieldValue),
    };
  },

  fromFirestore: (snapshot: DocumentSnapshot | QueryDocumentSnapshot): PatientDocument => {
    const data = snapshot.data();
    if (!data) {
      throw new Error('Patient document does not exist');
    }

    return {
      resourceType: 'Patient',
      id: snapshot.id,
      userId: data.userId,
      active: data.active ?? true,
      name: data.name || [],
      photo: data.photo || [],
      birthDate: data.birthDate || undefined,
      gender: data.gender || undefined,
      relationship: data.relationship || 'self',
      extension: data.extension || [],
      meta: data.meta || {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

// ============================================================================
// MedicationRequest Converter
// ============================================================================

export const medicationRequestConverter = {
  toFirestore: (medReq: MedicationRequestDocument): Record<string, any> => {
    return {
      resourceType: 'MedicationRequest',
      id: medReq.id,
      userId: medReq.userId,
      patientId: medReq.patientId,
      medicationName: medReq.medicationName,
      status: medReq.status,
      intent: medReq.intent || 'order',
      priority: medReq.priority || undefined,
      subject: medReq.subject || undefined,
      medicationCodeableConcept: medReq.medicationCodeableConcept || undefined,
      medicationReference: medReq.medicationReference || undefined,
      dosageInstruction: medReq.dosageInstruction || [],
      dispenseRequest: medReq.dispenseRequest || undefined,
      authoredOn: medReq.authoredOn || new Date().toISOString(),
      isPRN: medReq.isPRN ?? medReq.dosageInstruction?.[0]?.asNeededBoolean ?? false,
      meta: {
        ...medReq.meta,
        lastUpdated: serverTimestamp() as FieldValue,
      },
      updatedAt: serverTimestamp() as FieldValue,
      createdAt: medReq.createdAt || (serverTimestamp() as FieldValue),
    };
  },

  fromFirestore: (
    snapshot: DocumentSnapshot | QueryDocumentSnapshot
  ): MedicationRequestDocument => {
    const data = snapshot.data();
    if (!data) {
      throw new Error('MedicationRequest document does not exist');
    }

    return {
      resourceType: 'MedicationRequest',
      id: snapshot.id,
      userId: data.userId,
      patientId: data.patientId,
      medicationName: data.medicationName,
      status: data.status,
      intent: data.intent || 'order',
      priority: data.priority,
      subject: data.subject,
      medicationCodeableConcept: data.medicationCodeableConcept,
      medicationReference: data.medicationReference,
      dosageInstruction: data.dosageInstruction || [],
      dispenseRequest: data.dispenseRequest,
      authoredOn: data.authoredOn,
      isPRN: data.isPRN ?? false,
      meta: data.meta || {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

// ============================================================================
// MedicationAdministration Converter
// ============================================================================

export const medicationAdministrationConverter = {
  toFirestore: (medAdmin: MedicationAdministrationDocument): Record<string, any> => {
    return {
      resourceType: 'MedicationAdministration',
      id: medAdmin.id,
      userId: medAdmin.userId,
      patientId: medAdmin.patientId,
      medicationRequestId: medAdmin.medicationRequestId,
      status: medAdmin.status,
      statusReason: medAdmin.statusReason || undefined,
      subject: medAdmin.subject || undefined,
      medicationCodeableConcept: medAdmin.medicationCodeableConcept || undefined,
      medicationReference: medAdmin.medicationReference || undefined,
      effectiveDateTime: medAdmin.effectiveDateTime || (serverTimestamp() as FieldValue),
      effectivePeriod: medAdmin.effectivePeriod || undefined,
      performer: medAdmin.performer || [],
      reasonCode: medAdmin.reasonCode || undefined,
      reasonReference: medAdmin.reasonReference || undefined,
      request: medAdmin.request || undefined,
      dosage: medAdmin.dosage || undefined,
      note: medAdmin.note || [],
      isPRN: medAdmin.isPRN ?? false,
      reminderInstanceId: medAdmin.reminderInstanceId || undefined,
      meta: {
        ...medAdmin.meta,
        lastUpdated: serverTimestamp() as FieldValue,
      },
      updatedAt: serverTimestamp() as FieldValue,
      createdAt: medAdmin.createdAt || (serverTimestamp() as FieldValue),
    };
  },

  fromFirestore: (
    snapshot: DocumentSnapshot | QueryDocumentSnapshot
  ): MedicationAdministrationDocument => {
    const data = snapshot.data();
    if (!data) {
      throw new Error('MedicationAdministration document does not exist');
    }

    return {
      resourceType: 'MedicationAdministration',
      id: snapshot.id,
      userId: data.userId,
      patientId: data.patientId,
      medicationRequestId: data.medicationRequestId,
      status: data.status,
      statusReason: data.statusReason,
      subject: data.subject,
      medicationCodeableConcept: data.medicationCodeableConcept,
      medicationReference: data.medicationReference,
      effectiveDateTime: data.effectiveDateTime,
      effectivePeriod: data.effectivePeriod,
      performer: data.performer || [],
      reasonCode: data.reasonCode,
      reasonReference: data.reasonReference,
      request: data.request,
      dosage: data.dosage,
      note: data.note || [],
      isPRN: data.isPRN ?? false,
      reminderInstanceId: data.reminderInstanceId,
      meta: data.meta || {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

// ============================================================================
// RelatedPerson Converter
// ============================================================================

export const relatedPersonConverter = {
  toFirestore: (relatedPerson: RelatedPersonDocument): Record<string, any> => {
    return {
      resourceType: 'RelatedPerson',
      id: relatedPerson.id,
      patientUserId: relatedPerson.patientUserId,
      relatedUserId: relatedPerson.relatedUserId,
      active: relatedPerson.active ?? true,
      patient: relatedPerson.patient || undefined,
      relationship: relatedPerson.relationship || [],
      name: relatedPerson.name || [],
      telecom: relatedPerson.telecom || [],
      photo: relatedPerson.photo || [],
      period: relatedPerson.period || undefined,
      meta: {
        ...relatedPerson.meta,
        lastUpdated: serverTimestamp() as FieldValue,
      },
      updatedAt: serverTimestamp() as FieldValue,
      createdAt: relatedPerson.createdAt || (serverTimestamp() as FieldValue),
    };
  },

  fromFirestore: (
    snapshot: DocumentSnapshot | QueryDocumentSnapshot
  ): RelatedPersonDocument => {
    const data = snapshot.data();
    if (!data) {
      throw new Error('RelatedPerson document does not exist');
    }

    return {
      resourceType: 'RelatedPerson',
      id: snapshot.id,
      patientUserId: data.patientUserId,
      relatedUserId: data.relatedUserId,
      active: data.active ?? true,
      patient: data.patient,
      relationship: data.relationship || [],
      name: data.name || [],
      telecom: data.telecom || [],
      photo: data.photo || [],
      period: data.period,
      meta: data.meta || {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

// ============================================================================
// CareTeam Converter
// ============================================================================

export const careTeamConverter = {
  toFirestore: (careTeam: CareTeamDocument): Record<string, any> => {
    return {
      resourceType: 'CareTeam',
      id: careTeam.id,
      patientUserId: careTeam.patientUserId,
      status: careTeam.status || 'active',
      name: careTeam.name || undefined,
      subject: careTeam.subject || undefined,
      period: careTeam.period || undefined,
      participant: careTeam.participant || [],
      meta: {
        ...careTeam.meta,
        lastUpdated: serverTimestamp() as FieldValue,
      },
      updatedAt: serverTimestamp() as FieldValue,
      createdAt: careTeam.createdAt || (serverTimestamp() as FieldValue),
    };
  },

  fromFirestore: (snapshot: DocumentSnapshot | QueryDocumentSnapshot): CareTeamDocument => {
    const data = snapshot.data();
    if (!data) {
      throw new Error('CareTeam document does not exist');
    }

    return {
      resourceType: 'CareTeam',
      id: snapshot.id,
      patientUserId: data.patientUserId,
      status: data.status || 'active',
      name: data.name,
      subject: data.subject,
      period: data.period,
      participant: data.participant || [],
      meta: data.meta || {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

// ============================================================================
// FamilyConnection Converter
// ============================================================================

export const familyConnectionConverter = {
  toFirestore: (connection: FamilyConnection): Record<string, any> => {
    return {
      id: connection.id,
      patientUserId: connection.patientUserId,
      caregiverUserId: connection.caregiverUserId,
      patientId: connection.patientId,
      status: connection.status,
      permissions: connection.permissions,
      invitedAt: connection.invitedAt,
      invitedBy: connection.invitedBy,
      acceptedAt: connection.acceptedAt || null,
      rejectedAt: connection.rejectedAt || null,
      revokedAt: connection.revokedAt || null,
      updatedAt: serverTimestamp() as FieldValue,
      createdAt: connection.createdAt || (serverTimestamp() as FieldValue),
    };
  },

  fromFirestore: (snapshot: DocumentSnapshot | QueryDocumentSnapshot): FamilyConnection => {
    const data = snapshot.data();
    if (!data) {
      throw new Error('FamilyConnection document does not exist');
    }

    return {
      id: snapshot.id,
      patientUserId: data.patientUserId,
      caregiverUserId: data.caregiverUserId,
      patientId: data.patientId,
      status: data.status,
      permissions: data.permissions || [],
      invitedAt: data.invitedAt,
      invitedBy: data.invitedBy,
      acceptedAt: data.acceptedAt,
      rejectedAt: data.rejectedAt,
      revokedAt: data.revokedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

// ============================================================================
// ReminderSchedule Converter
// ============================================================================

export const reminderScheduleConverter = {
  toFirestore: (schedule: ReminderSchedule): Record<string, any> => {
    return {
      id: schedule.id,
      userId: schedule.userId,
      patientId: schedule.patientId,
      medicationRequestId: schedule.medicationRequestId,
      medicationName: schedule.medicationName,
      timing: schedule.timing,
      isPRN: schedule.isPRN,
      isEnabled: schedule.isEnabled,
      instances: schedule.instances,
      generatedAt: schedule.generatedAt,
      validUntil: schedule.validUntil,
      updatedAt: serverTimestamp() as FieldValue,
      createdAt: schedule.createdAt || (serverTimestamp() as FieldValue),
    };
  },

  fromFirestore: (snapshot: DocumentSnapshot | QueryDocumentSnapshot): ReminderSchedule => {
    const data = snapshot.data();
    if (!data) {
      throw new Error('ReminderSchedule document does not exist');
    }

    return {
      id: snapshot.id,
      userId: data.userId,
      patientId: data.patientId,
      medicationRequestId: data.medicationRequestId,
      medicationName: data.medicationName,
      timing: data.timing,
      isPRN: data.isPRN ?? false,
      isEnabled: data.isEnabled ?? true,
      instances: data.instances || [],
      generatedAt: data.generatedAt,
      validUntil: data.validUntil,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};
