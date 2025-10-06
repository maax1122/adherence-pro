/**
 * FHIR R4 TypeScript Interfaces
 * 
 * Defines FHIR R4-compliant resource types for the Medication Tracker app.
 * Based on: https://hl7.org/fhir/R4/
 * 
 * Resources implemented:
 * - Patient (§2): User profiles (self and family members)
 * - MedicationRequest (§3): Medication prescriptions/orders
 * - MedicationAdministration (§4): Medication dose logs
 * - RelatedPerson (§5): Caregiver relationships
 * - CareTeam (§5): Patient's care team
 * - ReminderSchedule (§6): Custom extension for notification scheduling
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Common FHIR Types
// ============================================================================

export interface FHIRMeta {
  profile?: string[];
  versionId?: string;
  lastUpdated?: string | Timestamp;
}

export interface FHIRExtension {
  url: string;
  valueString?: string;
  valueCode?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueDateTime?: string;
}

export interface FHIRCodeableConcept {
  coding?: Array<{
    system?: string;
    code?: string;
    display?: string;
  }>;
  text?: string;
}

export interface FHIRQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface FHIRReference {
  reference?: string;
  display?: string;
}

export interface FHIRPeriod {
  start?: string;
  end?: string;
}

// ============================================================================
// Patient Resource (FHIR R4)
// ============================================================================

export interface FHIRHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
}

export interface FHIRPhoto {
  contentType?: 'image/jpeg' | 'image/png' | 'image/gif';
  url?: string;
  data?: string; // Base64 encoded
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  meta?: FHIRMeta;
  
  // Extensions for Firebase integration
  extension?: FHIRExtension[];
  
  // Core fields
  active?: boolean;
  name?: FHIRHumanName[];
  photo?: FHIRPhoto[];
  birthDate?: string; // YYYY-MM-DD
  gender?: 'male' | 'female' | 'other' | 'unknown';
  
  // Custom fields (for app usage)
  userId?: string; // Denormalized Firebase Auth UID
  relationship?: 'self' | 'parent' | 'child' | 'spouse' | 'sibling' | 'grandparent' | 'grandchild' | 'other';
}

// Simplified Firestore document type
export interface PatientDocument extends FHIRPatient {
  userId: string; // Required in Firestore
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// MedicationRequest Resource (FHIR R4)
// ============================================================================

export interface FHIRTiming {
  repeat?: {
    frequency?: number;
    period?: number;
    periodUnit?: 'h' | 'd' | 'wk' | 'mo';
    timeOfDay?: string[]; // ["08:00:00", "20:00:00"]
    dayOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
    boundsDuration?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
    count?: number; // Total number of times to repeat
    countMax?: number;
  };
  code?: FHIRCodeableConcept;
}

export interface FHIRDosage {
  sequence?: number;
  text?: string;
  timing?: FHIRTiming;
  asNeededBoolean?: boolean;
  asNeededCodeableConcept?: FHIRCodeableConcept;
  route?: FHIRCodeableConcept;
  doseAndRate?: Array<{
    doseQuantity?: FHIRQuantity;
    rateQuantity?: FHIRQuantity;
  }>;
  maxDosePerPeriod?: {
    numerator?: FHIRQuantity;
    denominator?: FHIRQuantity;
  };
  patientInstruction?: string;
}

export interface FHIRMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  meta?: FHIRMeta;
  
  // Status
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped' | 'draft' | 'entered-in-error';
  intent: 'order' | 'plan' | 'proposal' | 'instance-order';
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  
  // Subject (patient)
  subject?: FHIRReference;
  
  // Medication
  medicationCodeableConcept?: FHIRCodeableConcept;
  medicationReference?: FHIRReference;
  
  // Dosage
  dosageInstruction?: FHIRDosage[];
  
  // Dispense request
  dispenseRequest?: {
    validityPeriod?: FHIRPeriod;
    numberOfRepeatsAllowed?: number;
    quantity?: FHIRQuantity;
    expectedSupplyDuration?: FHIRQuantity;
  };
  
  // Authored date
  authoredOn?: string;
  
  // Custom fields (for app usage)
  userId?: string; // Denormalized Firebase Auth UID
  patientId?: string; // Denormalized Patient ID
  medicationName?: string; // Simplified name for queries
  isPRN?: boolean; // Denormalized from dosageInstruction[0].asNeededBoolean
}

// Simplified Firestore document type
export interface MedicationRequestDocument extends FHIRMedicationRequest {
  userId: string; // Required in Firestore
  patientId: string; // Required in Firestore
  medicationName: string; // Required in Firestore
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// MedicationAdministration Resource (FHIR R4)
// ============================================================================

export interface FHIRMedicationAdministration {
  resourceType: 'MedicationAdministration';
  id: string;
  meta?: FHIRMeta;
  
  // Status
  status: 'completed' | 'not-done' | 'on-hold' | 'stopped' | 'in-progress' | 'entered-in-error' | 'unknown';
  statusReason?: FHIRCodeableConcept[];
  
  // Subject (patient)
  subject?: FHIRReference;
  
  // Medication
  medicationCodeableConcept?: FHIRCodeableConcept;
  medicationReference?: FHIRReference;
  
  // Effective time (when administered)
  effectiveDateTime?: string | Timestamp;
  effectivePeriod?: FHIRPeriod;
  
  // Performer (who administered)
  performer?: Array<{
    function?: FHIRCodeableConcept;
    actor: FHIRReference;
  }>;
  
  // Reason
  reasonCode?: FHIRCodeableConcept[];
  reasonReference?: FHIRReference[];
  
  // Request reference
  request?: FHIRReference; // Reference to MedicationRequest
  
  // Dosage
  dosage?: {
    text?: string;
    route?: FHIRCodeableConcept;
    dose?: FHIRQuantity;
  };
  
  // Notes
  note?: Array<{
    authorReference?: FHIRReference;
    time?: string;
    text?: string;
  }>;
  
  // Custom fields (for app usage)
  userId?: string; // Denormalized Firebase Auth UID
  patientId?: string; // Denormalized Patient ID
  medicationRequestId?: string; // Denormalized MedicationRequest ID
  isPRN?: boolean; // Denormalized from MedicationRequest
  reminderInstanceId?: string; // Link to ReminderSchedule instance
}

// Simplified Firestore document type
export interface MedicationAdministrationDocument extends FHIRMedicationAdministration {
  userId: string; // Required in Firestore
  patientId: string; // Required in Firestore
  medicationRequestId: string; // Required in Firestore
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// RelatedPerson Resource (FHIR R4)
// ============================================================================

export interface FHIRRelatedPerson {
  resourceType: 'RelatedPerson';
  id: string;
  meta?: FHIRMeta;
  
  active?: boolean;
  patient?: FHIRReference;
  relationship?: FHIRCodeableConcept[];
  name?: FHIRHumanName[];
  telecom?: Array<{
    system?: 'phone' | 'email' | 'fax' | 'pager' | 'url' | 'sms' | 'other';
    value?: string;
    use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  }>;
  photo?: FHIRPhoto[];
  period?: FHIRPeriod;
}

// Simplified Firestore document type
export interface RelatedPersonDocument extends FHIRRelatedPerson {
  patientUserId: string; // Firebase Auth UID of patient
  relatedUserId: string; // Firebase Auth UID of related person
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// CareTeam Resource (FHIR R4)
// ============================================================================

export interface FHIRCareTeam {
  resourceType: 'CareTeam';
  id: string;
  meta?: FHIRMeta;
  
  status?: 'proposed' | 'active' | 'suspended' | 'inactive' | 'entered-in-error';
  name?: string;
  subject?: FHIRReference; // Patient
  period?: FHIRPeriod;
  
  participant?: Array<{
    role?: FHIRCodeableConcept[];
    member?: FHIRReference; // RelatedPerson, Practitioner, etc.
    period?: FHIRPeriod;
  }>;
}

// Simplified Firestore document type
export interface CareTeamDocument extends FHIRCareTeam {
  patientUserId: string; // Firebase Auth UID of patient
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// FamilyConnection (Custom Document Type)
// ============================================================================

export interface FamilyConnection {
  id: string;
  patientUserId: string; // Firebase Auth UID of patient
  caregiverUserId: string; // Firebase Auth UID of caregiver
  patientId: string; // FHIR Patient resource ID
  
  // Status lifecycle
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  
  // Permissions
  permissions: ('view_only' | 'can_log')[];
  
  // Timestamps
  invitedAt: Timestamp;
  invitedBy: string; // userId who created invitation
  acceptedAt?: Timestamp;
  rejectedAt?: Timestamp;
  revokedAt?: Timestamp;
  
  // Metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// ReminderSchedule (Custom Extension)
// ============================================================================

export interface ReminderInstance {
  id: string;
  instanceDate: string; // YYYY-MM-DD
  timeOfDay: string; // HH:MM:SS
  effectiveDateTime: Timestamp; // Computed from instanceDate + timeOfDay
  status: 'pending' | 'sent' | 'completed' | 'missed' | 'cancelled';
  notificationId?: string; // Expo notification ID
  sentAt?: Timestamp;
  loggedAt?: Timestamp;
  medicationAdministrationId?: string; // Link to log
}

export interface ReminderSchedule {
  id: string;
  userId: string; // Firebase Auth UID
  patientId: string; // FHIR Patient resource ID
  medicationRequestId: string; // FHIR MedicationRequest resource ID
  medicationName: string; // Denormalized for queries
  
  // Schedule details
  timing: FHIRTiming;
  isPRN: boolean; // If true, no instances generated
  isEnabled: boolean; // User can snooze/disable reminders
  
  // Instances (pre-computed for 30 days)
  instances: ReminderInstance[];
  
  // Metadata
  generatedAt: Timestamp; // When instances were last computed
  validUntil: string; // YYYY-MM-DD (last instance date)
  
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// Utility Types
// ============================================================================

export type FHIRResource =
  | FHIRPatient
  | FHIRMedicationRequest
  | FHIRMedicationAdministration
  | FHIRRelatedPerson
  | FHIRCareTeam;

export type FirestoreDocument =
  | PatientDocument
  | MedicationRequestDocument
  | MedicationAdministrationDocument
  | RelatedPersonDocument
  | CareTeamDocument
  | FamilyConnection
  | ReminderSchedule;
