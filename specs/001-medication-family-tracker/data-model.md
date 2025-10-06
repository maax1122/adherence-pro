# Data Model: Medication Family Tracker (FHIR-Compliant)

**Date**: 2025-10-06
**Feature**: Medication Family Tracker MVP
**FHIR Version**: R4 (4.0.1)

## Design Philosophy

This data model follows **FHIR (Fast Healthcare Interoperability Resources) R4** standards to ensure:
- **Interoperability**: Compatible with healthcare systems, EHRs, and FHIR APIs
- **Future-proof**: Easy integration with telehealth, pharmacy APIs, and health records
- **Standardization**: Industry-standard terminology (SNOMED CT, LOINC, RxNorm)
- **Extensibility**: FHIR's extension mechanism for custom fields

**FHIR Resource Mapping**:
- Profile → `Patient` resource
- Medication → `MedicationRequest` + `Medication` resources
- MedicationLog → `MedicationAdministration` resource
- FamilyConnection → `RelatedPerson` + `CareTeam` resources
- ReminderSchedule → Custom extension on `MedicationRequest`

## Entity Relationship Overview

```
User (Firebase Auth)
  └─has many→ Patient (FHIR Patient)
                ├─has many→ MedicationRequest (FHIR MedicationRequest)
                │            └─references→ Medication (FHIR Medication)
                │            └─has many→ MedicationAdministration (FHIR)
                ├─has many→ ReminderSchedule (Custom Extension)
                └─related via→ RelatedPerson & CareTeam (FHIR)
```

**FHIR References**:
- FHIR R4 Spec: https://hl7.org/fhir/R4/
- Patient: https://hl7.org/fhir/R4/patient.html
- MedicationRequest: https://hl7.org/fhir/R4/medicationrequest.html
- MedicationAdministration: https://hl7.org/fhir/R4/medicationadministration.html

---

## Entities

### 1. User (Firebase Auth)
**Purpose**: Authentication identity managed by Firebase Auth

**Storage**: Firebase Authentication (not Firestore)

**Attributes**:
```typescript
interface FirebaseUser {
  uid: string;                    // Firebase-generated unique ID
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerData: Array<{           // Google, Apple, email providers
    providerId: string;
    uid: string;
  }>;
}
```

**Notes**:
- Managed by Firebase Auth SDK
- UID used as foreign key in Firestore documents
- Not stored in Firestore (auth-only)

---

### 2. Patient (FHIR Patient Resource)
**Purpose**: Represents a family member (patient) whose medications are tracked

**FHIR Resource**: `Patient` (https://hl7.org/fhir/R4/patient.html)

**Firestore Path**: `/users/{userId}/patients/{patientId}`

**TypeScript Interface** (FHIR-compliant):
```typescript
interface FHIRPatient {
  resourceType: 'Patient';
  id: string;                     // Auto-generated document ID
  meta: {
    profile: ['http://hl7.org/fhir/StructureDefinition/Patient'];
    versionId: string;
    lastUpdated: string;          // ISO 8601 timestamp
  };
  
  // Extension: Link to Firebase Auth user
  extension: [{
    url: 'http://adherence-pro.app/fhir/StructureDefinition/firebase-user-id';
    valueString: string;          // Firebase Auth UID
  }, {
    url: 'http://adherence-pro.app/fhir/StructureDefinition/profile-role';
    valueCode: 'self' | 'family_member';
  }];
  
  // Standard FHIR Patient fields
  active: boolean;                // true = active, false = archived
  name: [{
    use: 'usual';
    text: string;                 // e.g., "Mom", "John Doe"
    family?: string;              // Last name (optional)
    given?: string[];             // First/middle names (optional)
  }];
  
  photo?: [{
    contentType: 'image/jpeg' | 'image/png';
    url: string;                  // Firebase Storage URL
  }];
  
  birthDate?: string;             // YYYY-MM-DD format (optional)
  
  // Medical conditions using FHIR Condition references
  // Stored separately as Condition resources, referenced here
  condition?: Array<{
    reference: string;            // "Condition/{conditionId}"
    display: string;              // e.g., "Hypertension", "Type 2 Diabetes"
  }>;
  
  // Custom fields (via extensions)
  // Age calculated from birthDate, stored for quick access
  _age?: number;                  // Derived field, not standard FHIR
}
```

**Firestore Document** (simplified for storage):
```typescript
interface PatientDocument {
  resourceType: 'Patient';
  id: string;
  userId: string;                 // Denormalized from extension
  active: boolean;
  name: string;                   // Flattened from name[0].text
  birthDate: string | null;
  age: number | null;             // Calculated or manually entered
  photoUrl: string | null;
  conditions: string[];           // Simplified: ["Hypertension", "Diabetes"]
  role: 'self' | 'family_member';
  meta: {
    versionId: string;
    lastUpdated: Timestamp;
  };
  // Full FHIR resource stored in 'fhirResource' field for export
  fhirResource?: FHIRPatient;
}
```

**Indexes**:
- `userId` (for querying user's patients)
- `active` (to filter active patients)

**Validation Rules**:
- `name`: 1-100 characters, non-empty
- `birthDate`: Valid ISO 8601 date (YYYY-MM-DD) or null
- `age`: 0-150 if provided
- `userId`: Must match authenticated user

**FHIR Validation**:
- Must conform to FHIR Patient resource schema
- Use FHIR Validator for production: https://www.hl7.org/fhir/validation.html

**Security Rules**:
```javascript
match /users/{userId}/patients/{patientId} {
  allow read, write: if request.auth.uid == userId;
  // Validate FHIR resourceType
  allow write: if request.resource.data.resourceType == 'Patient';
}
```

---

### 3. MedicationRequest (FHIR MedicationRequest Resource)
**Purpose**: Represents a medication prescription/order for a specific patient

**FHIR Resource**: `MedicationRequest` (https://hl7.org/fhir/R4/medicationrequest.html)

**Firestore Path**: `/users/{userId}/patients/{patientId}/medication_requests/{requestId}`

**TypeScript Interface** (FHIR-compliant):
```typescript
interface FHIRMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;                     // Auto-generated document ID
  meta: {
    profile: ['http://hl7.org/fhir/StructureDefinition/MedicationRequest'];
    versionId: string;
    lastUpdated: string;          // ISO 8601 timestamp
  };
  
  // Status: active, completed, cancelled, stopped
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped';
  
  // Intent: order (patient-initiated in MVP)
  intent: 'order' | 'plan';
  
  // Priority (for PRN vs scheduled)
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  
  // Reference to patient
  subject: {
    reference: string;            // "Patient/{patientId}"
    display: string;              // Patient name
  };
  
  // Medication details (can be inline or reference)
  medicationCodeableConcept?: {
    coding: [{
      system: 'http://www.nlm.nih.gov/research/umls/rxnorm'; // RxNorm codes
      code: string;               // e.g., "313782" for Aspirin 81mg
      display: string;            // e.g., "Aspirin 81mg"
    }];
    text: string;                 // Free text: "Aspirin"
  };
  
  // Dosage instructions (FHIR Dosage datatype)
  dosageInstruction: [{
    sequence: number;             // Order of instructions
    text: string;                 // Human-readable: "Take 1 tablet by mouth twice daily"
    
    // Timing (when to take)
    timing: {
      repeat?: {
        frequency: number;        // How many times per period (e.g., 2)
        period: number;           // Time period (e.g., 1)
        periodUnit: 'h' | 'd' | 'wk' | 'mo'; // Hour, day, week, month
        timeOfDay?: string[];     // ["08:00:00", "20:00:00"] for specific times
        dayOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
      };
      code?: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-GTSAbbreviation';
          code: string;           // e.g., "BID" (twice daily), "PRN" (as needed)
          display: string;
        }];
      };
    };
    
    // As-needed indicator
    asNeededBoolean?: boolean;    // true for PRN medications
    asNeededCodeableConcept?: {   // Condition for PRN
      text: string;               // "When headache occurs"
    };
    
    // Route (oral, topical, injection, etc.)
    route?: {
      coding: [{
        system: 'http://snomed.info/sct';
        code: string;             // e.g., "26643006" for oral
        display: string;          // "Oral"
      }];
      text: string;
    };
    
    // Dose and rate
    doseAndRate?: [{
      doseQuantity?: {
        value: number;            // e.g., 100
        unit: string;             // e.g., "mg", "tablet(s)"
        system: 'http://unitsofmeasure.org';
        code: string;             // UCUM code: "mg", "{tablet}"
      };
    }];
    
    // Maximum dose per period (for PRN)
    maxDosePerPeriod?: {
      numerator: {
        value: number;            // e.g., 6
        unit: string;             // "tablet(s)"
      };
      denominator: {
        value: number;            // e.g., 1
        unit: string;             // "day"
      };
    };
    
    // Additional instructions
    patientInstruction?: string;  // "Take with food"
  }];
  
  // Dispense request (duration)
  dispenseRequest?: {
    validityPeriod?: {
      start: string;              // ISO 8601: "2025-10-06"
      end?: string;               // ISO 8601: "2025-10-20" (optional, indefinite if null)
    };
    numberOfRepeatsAllowed?: number;
    quantity?: {
      value: number;              // Total quantity (e.g., 30 tablets)
      unit: string;
      code: string;
    };
    expectedSupplyDuration?: {
      value: number;              // e.g., 14 (days)
      unit: 'd';                  // days
      system: 'http://unitsofmeasure.org';
      code: 'd';
    };
  };
  
  // Notes and instructions
  note?: [{
    text: string;                 // Free-text notes
    authorReference?: {
      reference: string;          // "Practitioner/{practitionerId}" or "Patient/{patientId}"
    };
    time?: string;                // ISO 8601 timestamp
  }];
  
  // Requester (who prescribed)
  requester?: {
    reference: string;            // "Practitioner/{doctorId}" or "Patient/{patientId}"
    display: string;              // Doctor name or "Self"
  };
  
  // Extensions for app-specific data
  extension?: [{
    url: 'http://adherence-pro.app/fhir/StructureDefinition/medication-photo';
    valueAttachment?: {
      contentType: 'image/jpeg' | 'image/png';
      url: string;                // Firebase Storage URL
      title: string;              // "Photo of Aspirin bottle"
    };
  }, {
    url: 'http://adherence-pro.app/fhir/StructureDefinition/visual-description';
    valueString?: string;         // "White round pill with 'ASP' imprint"
  }, {
    url: 'http://adherence-pro.app/fhir/StructureDefinition/created-by';
    valueReference: {
      reference: string;          // "Patient/{caregiverId}" or "Patient/{patientId}"
      display: string;            // "Caregiver: Jane Doe" or "Self"
    };
  }];
}
```

**Firestore Document** (simplified for storage):
```typescript
interface MedicationRequestDocument {
  resourceType: 'MedicationRequest';
  id: string;
  patientId: string;              // Denormalized from subject.reference
  userId: string;                 // Denormalized for queries
  status: 'active' | 'completed' | 'cancelled' | 'stopped';
  
  // Simplified medication info
  medicationName: string;         // e.g., "Aspirin"
  dosageText: string;             // e.g., "Take 1 tablet twice daily"
  dosageAmount: string;           // e.g., "100mg"
  form: string;                   // "tablet", "liquid", "injection"
  route: string;                  // "oral", "injection", "topical"
  
  // Simplified timing
  isPRN: boolean;                 // As-needed vs scheduled
  frequency: number | null;       // Times per day (null for PRN)
  intakeTimes: string[];          // ["08:00", "20:00"]
  daysOfWeek: string[] | null;   // ["mon", "wed", "fri"] or null for daily
  
  // PRN details
  prnCondition: string | null;    // "When headache occurs"
  maxDosePerDay: string | null;   // "6 tablets"
  
  // Duration
  startDate: Timestamp;
  endDate: Timestamp | null;
  
  // Metadata
  prescribedBy: string | null;
  photoUrl: string | null;
  visualDescription: string | null;
  notes: string | null;
  createdBy: string;
  
  meta: {
    versionId: string;
    lastUpdated: Timestamp;
  };
  
  // Full FHIR resource for export/integration
  fhirResource?: FHIRMedicationRequest;
}
```

**Indexes**:
- Composite: `(profileId, isActive, startDate)` for active meds query
- `userId` (for cross-profile medication queries)
- `isPRN` (to separate PRN from scheduled)

**Validation Rules**:
- `name`: 1-100 characters
- `dosageAmount`: 1-50 characters
- `intakeTimes`: Array of valid HH:mm strings (00:00 to 23:59)
- `frequency.value`: 1-10 for scheduled meds
- `startDate <= endDate` if both provided

**Security Rules**:
```javascript
match /users/{userId}/profiles/{profileId}/medications/{medicationId} {
  allow read: if request.auth.uid == userId || isCaregiver(request.auth.uid, profileId);
  allow write: if request.auth.uid == userId || isCaregiver(request.auth.uid, profileId);
}
```

---

### 4. MedicationAdministration (FHIR MedicationAdministration Resource)
**Purpose**: Records a single medication intake event (taken/missed)

**FHIR Resource**: `MedicationAdministration` (https://hl7.org/fhir/R4/medicationadministration.html)

**Firestore Path**: `/users/{userId}/patients/{patientId}/medication_requests/{requestId}/administrations/{administrationId}`

**TypeScript Interface** (FHIR-compliant):
```typescript
interface FHIRMedicationAdministration {
  resourceType: 'MedicationAdministration';
  id: string;                     // Auto-generated document ID
  meta: {
    profile: ['http://hl7.org/fhir/StructureDefinition/MedicationAdministration'];
    versionId: string;
    lastUpdated: string;          // ISO 8601 timestamp
  };
  
  // Status: in-progress, not-done, on-hold, completed, stopped, unknown
  status: 'completed' | 'not-done' | 'unknown';
  
  // Status reason (why not done, if applicable)
  statusReason?: [{
    coding: [{
      system: 'http://terminology.hl7.org/CodeSystem/reason-medication-not-given';
      code: string;               // e.g., "forgot", "refused", "asleep"
      display: string;
    }];
    text: string;                 // "Patient forgot"
  }];
  
  // Reference to patient
  subject: {
    reference: string;            // "Patient/{patientId}"
    display: string;
  };
  
  // Context (link to MedicationRequest)
  context?: {
    reference: string;            // "MedicationRequest/{requestId}"
  };
  
  // Medication reference
  medicationReference?: {
    reference: string;            // "Medication/{medicationId}"
    display: string;              // "Aspirin 100mg"
  };
  
  // When administered
  effectiveDateTime?: string;     // ISO 8601: "2025-10-06T08:00:00Z" (actual time)
  effectivePeriod?: {             // Alternative: period of administration
    start: string;
    end?: string;
  };
  
  // Performer (who administered)
  performer?: [{
    function?: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/med-admin-perform-function';
        code: string;             // "performer" or "witness"
        display: string;
      }];
    };
    actor: {
      reference: string;          // "Patient/{patientId}" or "RelatedPerson/{caregiverId}"
      display: string;            // "Self" or "Caregiver: Jane Doe"
    };
  }];
  
  // Dosage administered
  dosage?: {
    text?: string;                // "100mg tablet taken orally"
    route?: {
      coding: [{
        system: 'http://snomed.info/sct';
        code: string;             // e.g., "26643006" for oral
        display: string;
      }];
    };
    dose?: {
      value: number;              // e.g., 1
      unit: string;               // "tablet"
      system: 'http://unitsofmeasure.org';
      code: string;               // "{tablet}"
    };
  };
  
  // Notes
  note?: [{
    authorReference?: {
      reference: string;          // Who wrote the note
    };
    time?: string;                // When note was written
    text: string;                 // "Took with breakfast"
  }];
  
  // Extensions for app-specific data
  extension?: [{
    url: 'http://adherence-pro.app/fhir/StructureDefinition/scheduled-time';
    valueDateTime?: string;       // When reminder was scheduled
  }, {
    url: 'http://adherence-pro.app/fhir/StructureDefinition/administration-status';
    valueCode: 'taken' | 'missed' | 'taken_late';
  }, {
    url: 'http://adherence-pro.app/fhir/StructureDefinition/edit-history';
    valueString?: string;         // JSON string of edit history
  }];
}
```

**Firestore Document** (simplified for storage):
```typescript
interface MedicationAdministrationDocument {
  resourceType: 'MedicationAdministration';
  id: string;
  patientId: string;              // Denormalized
  medicationRequestId: string;    // Foreign key
  userId: string;                 // Denormalized
  
  // Status (FHIR + custom)
  status: 'completed' | 'not-done' | 'unknown';
  administrationStatus: 'taken' | 'missed' | 'taken_late'; // App-specific
  statusReason: string | null;    // Why not done (if status = 'not-done')
  
  // Timing
  scheduledTime: Timestamp | null; // When reminder was scheduled
  actualTime: Timestamp;          // When actually taken/logged
  
  // Dosage
  doseText: string;               // "1 tablet"
  route: string;                  // "oral"
  
  // Performer
  performedBy: string;            // userId who performed (patient or caregiver)
  performedByRole: 'patient' | 'caregiver';
  performedByName: string;        // Display name
  
  // Metadata
  notes: string | null;
  
  meta: {
    versionId: string;
    lastUpdated: Timestamp;
    createdAt: Timestamp;         // For 24-hour edit window
  };
  
  // Edit tracking
  isEdited: boolean;
  editHistory?: Array<{
    editedAt: Timestamp;
    previousStatus: 'taken' | 'missed' | 'taken_late';
    editedBy: string;
    editedByName: string;
  }>;
  
  // Full FHIR resource for export
  fhirResource?: FHIRMedicationAdministration;
}
```

**Indexes**:
- Composite: `(medicationId, actualTime)` for time-series queries
- Composite: `(profileId, actualTime)` for adherence dashboard
- `userId` (for cross-profile reports)

**Validation Rules**:
- `actualTime`: Cannot be in the future
- `actualTime - createdAt <= 24 hours` for edits (edit window)
- `status`: Must be valid enum value

**Security Rules**:
```javascript
match /users/{userId}/profiles/{profileId}/medications/{medicationId}/logs/{logId} {
  allow read: if request.auth.uid == userId || isCaregiver(request.auth.uid, profileId);
  allow create: if request.auth.uid == userId || isCaregiver(request.auth.uid, profileId);
  allow update: if (request.auth.uid == userId || isCaregiver(request.auth.uid, profileId))
                && resource.data.createdAt.toMillis() > request.time.toMillis() - 86400000; // 24h window
}
```

---

### 5. RelatedPerson & CareTeam (FHIR Resources)
**Purpose**: Represents the relationship between a patient and caregiver

**FHIR Resources**: 
- `RelatedPerson` (https://hl7.org/fhir/R4/relatedperson.html) - Who the caregiver is
- `CareTeam` (https://hl7.org/fhir/R4/careteam.html) - Team caring for patient

**Firestore Path**: `/family_connections/{connectionId}` (hybrid FHIR + custom)

**TypeScript Interface** (FHIR-compliant):
```typescript
// RelatedPerson: Who the caregiver is in relation to patient
interface FHIRRelatedPerson {
  resourceType: 'RelatedPerson';
  id: string;                     // Auto-generated document ID
  meta: {
    profile: ['http://hl7.org/fhir/StructureDefinition/RelatedPerson'];
    versionId: string;
    lastUpdated: string;
  };
  
  // Active status
  active: boolean;                // true if connection active
  
  // Patient reference
  patient: {
    reference: string;            // "Patient/{patientId}"
    display: string;
  };
  
  // Relationship (child, parent, spouse, friend, etc.)
  relationship?: [{
    coding: [{
      system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
      code: string;               // e.g., "CHILD", "PARENT", "GUARD" (guardian)
      display: string;            // "Child", "Parent", "Guardian"
    }];
    text: string;                 // "Daughter", "Son", "Caregiver"
  }];
  
  // Caregiver's name
  name?: [{
    use: 'usual';
    text: string;
    family?: string;
    given?: string[];
  }];
  
  // Contact info
  telecom?: [{
    system: 'phone' | 'email';
    value: string;
    use: 'home' | 'work' | 'mobile';
  }];
  
  // Photo
  photo?: [{
    contentType: 'image/jpeg' | 'image/png';
    url: string;
  }];
  
  // Period of relationship
  period?: {
    start: string;                // When connection started
    end?: string;                 // When connection ended (if revoked)
  };
  
  // Communication preferences
  communication?: [{
    language: {
      coding: [{
        system: 'urn:ietf:bcp:47';
        code: string;             // "en", "vi"
        display: string;
      }];
    };
    preferred?: boolean;
  }];
  
  // Extensions for app-specific data
  extension?: [{
    url: 'http://adherence-pro.app/fhir/StructureDefinition/firebase-user-id';
    valueString: string;          // Firebase Auth UID
  }, {
    url: 'http://adherence-pro.app/fhir/StructureDefinition/permission-level';
    valueCode: 'view_only' | 'can_log';
  }, {
    url: 'http://adherence-pro.app/fhir/StructureDefinition/notification-preferences';
    valueBoolean: boolean;        // Wants miss alerts?
  }, {
    url: 'http://adherence-pro.app/fhir/StructureDefinition/invitation-status';
    valueCode: 'pending' | 'accepted' | 'rejected' | 'revoked';
  }];
}

// CareTeam: Group of caregivers for a patient
interface FHIRCareTeam {
  resourceType: 'CareTeam';
  id: string;
  meta: {
    profile: ['http://hl7.org/fhir/StructureDefinition/CareTeam'];
    versionId: string;
    lastUpdated: string;
  };
  
  status: 'active' | 'suspended' | 'inactive';
  
  // Patient being cared for
  subject: {
    reference: string;            // "Patient/{patientId}"
    display: string;
  };
  
  // Period team is active
  period?: {
    start: string;
    end?: string;
  };
  
  // Team participants (caregivers)
  participant?: [{
    role: [{
      coding: [{
        system: 'http://snomed.info/sct';
        code: string;             // e.g., "133932002" for Caregiver
        display: string;
      }];
      text: string;               // "Primary Caregiver", "Family Member"
    }];
    member: {
      reference: string;          // "RelatedPerson/{relatedPersonId}"
      display: string;
    };
    period?: {
      start: string;
      end?: string;
    };
  }];
  
  // Managing organization (optional)
  managingOrganization?: [{
    reference: string;            // "Organization/{orgId}"
    display: string;              // "Adherence Pro"
  }];
}
```

**Firestore Document** (simplified hybrid):
```typescript
interface FamilyConnectionDocument {
  id: string;
  
  // Patient info
  patientUserId: string;
  patientId: string;              // FHIR Patient ID
  patientName: string;
  
  // Caregiver info
  caregiverUserId: string;
  caregiverId: string;            // FHIR RelatedPerson ID
  caregiverName: string;
  
  // Relationship
  relationship: string;           // "Child", "Spouse", "Friend", "Nurse"
  
  // Permissions
  permissionLevel: 'view_only' | 'can_log';
  canReceiveNotifications: boolean;
  
  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  invitedAt: Timestamp;
  acceptedAt: Timestamp | null;
  revokedAt: Timestamp | null;
  
  // Metadata
  invitationMessage: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // FHIR resources for export
  relatedPersonResource?: FHIRRelatedPerson;
  careTeamReference?: string;     // Reference to CareTeam/{teamId}
}
```

**Indexes**:
- Composite: `(patientUserId, status)` for patient's active connections
- Composite: `(caregiverUserId, status)` for caregiver's active connections
- Composite: `(patientProfileId, caregiverUserId)` for duplicate prevention

**Validation Rules**:
- `patientUserId != caregiverUserId` (can't monitor yourself)
- `status` transitions: pending → accepted/rejected, accepted → revoked

**Security Rules**:
```javascript
match /family_connections/{connectionId} {
  allow read: if request.auth.uid == resource.data.patientUserId 
              || request.auth.uid == resource.data.caregiverUserId;
  allow create: if request.auth.uid == request.resource.data.patientUserId; // Patient creates
  allow update: if (request.auth.uid == resource.data.caregiverUserId && isAcceptReject())
                || (request.auth.uid == resource.data.patientUserId && isRevoke());
}
```

---

### 6. Reminder Schedule (FHIR Extension Pattern)
**Purpose**: Pre-computed reminder instances for optimized notification scheduling

**FHIR Approach**: 
- Reminders are derived from `MedicationRequest.dosageInstruction.timing`
- Notification instances stored as custom extension for performance
- Schedule is **computed on-device** and synced to Firestore, not in standard FHIR format

**Firestore Path**: `/reminder_schedules/{scheduleId}`

**TypeScript Interface** (App-specific with FHIR references):
```typescript
interface ReminderSchedule {
  id: string;                     // Auto-generated document ID
  
  // FHIR References
  userId: string;                 // Firebase Auth UID
  patientId: string;              // FHIR Patient.id
  medicationRequestId: string;    // FHIR MedicationRequest.id
  medicationRequestReference: string; // "MedicationRequest/{id}"
  
  // Schedule Configuration (computed from MedicationRequest.dosageInstruction.timing)
  timing: {
    repeat: {
      frequency: number;          // From dosageInstruction.timing.repeat.frequency
      period: number;             // From dosageInstruction.timing.repeat.period
      periodUnit: 'h' | 'd' | 'wk'; // From dosageInstruction.timing.repeat.periodUnit
      timeOfDay?: string[];       // From dosageInstruction.timing.repeat.timeOfDay
      dayOfWeek?: string[];       // From dosageInstruction.timing.repeat.dayOfWeek
    };
  };
  
  // Pre-computed instances (next 30 days for performance)
  instances: {
    scheduledTime: Timestamp;     // Exact time for notification
    instanceId: string;           // Unique ID for deduplication (UUID)
    notificationSent: boolean;    // Has push notification been sent?
    sentAt: Timestamp | null;     // When notification was sent
    expoNotificationId?: string;  // Expo notification receipt ID
  }[];
  
  // Notification Preferences
  notificationTitle: string;      // e.g., "Time to take Aspirin"
  notificationBody: string;       // e.g., "Take 100mg tablet"
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  isEnabled: boolean;             // Can disable without deleting
  
  // Lifecycle (from MedicationRequest.dispenseRequest.validityPeriod)
  effectiveDate: Timestamp;       // When schedule starts
  endDate: Timestamp | null;      // When schedule ends (null = ongoing)
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  nextComputeAt: Timestamp;       // When to recompute instances (rolling window)
  
  // FHIR Extension reference (for FHIR export)
  fhirExtension?: {
    url: 'http://adherence-pro.app/fhir/StructureDefinition/reminder-schedule';
    extension: [{
      url: 'instances';
      valueString: string;        // JSON array of instances
    }, {
      url: 'nextComputeAt';
      valueDateTime: string;
    }];
  };
}

// How it maps to FHIR:
// 1. MedicationRequest.dosageInstruction.timing defines WHEN to take medication
// 2. App computes reminder instances from timing rules
// 3. Instances stored in separate collection for query performance
// 4. On FHIR export, instances can be attached as extension or omitted (derived data)
```

**Indexes**:
- Composite: `(userId, effectiveDate, endDate)` for active schedules
- Composite: `(medicationRequestId, nextComputeAt)` for schedule refresh
- `instances.scheduledTime` for upcoming reminder queries

**Validation Rules**:
- `timing.repeat.timeOfDay`: Valid HH:mm:ss format (per FHIR spec)
- `timing.repeat.dayOfWeek`: Array of strings ["mon", "tue", "wed", etc.]
- `instances`: Max 100 pre-computed instances

**Security Rules**:
```javascript
match /reminder_schedules/{scheduleId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow write: if request.auth.uid == request.resource.data.userId;
}
```

---

## Firestore Collection Structure (FHIR-Aligned)

```
/patients/{patientId}/
  (FHIRPatient document)

/medication_requests/{medicationRequestId}/
  (FHIRMedicationRequest document)

/medication_administrations/{administrationId}/
  (FHIRMedicationAdministration document)

/family_connections/{connectionId}/
  (FamilyConnection document with RelatedPerson resource)

/care_teams/{teamId}/
  (FHIRCareTeam document - optional, created when 2+ caregivers)

/reminder_schedules/{scheduleId}/
  (ReminderSchedule with FHIR references)
```

**Rationale for Flat Collections**:
- **Flat FHIR resources**: Standard FHIR approach uses resource-level collections, not nested subcollections
- **Cross-references**: Resources reference each other via `{resourceType}/{id}` pattern
- **Query flexibility**: Easier to query across all medication requests or administrations
- **Scalability**: Firestore performs better with shallow hierarchies for large datasets
- **FHIR export**: Direct mapping to FHIR Bundle without complex traversal

**Denormalization for Performance**:
- Each resource includes `userId` field for security rules and user-scoped queries
- MedicationAdministration includes `medicationRequestReference` and denormalized `medicationName`
- ReminderSchedule includes `userId` and `patientId` for fast lookup

**Indexes Required** (see firestore.indexes.json):
- Patients: `(userId, active)` for user's profiles
- MedicationRequests: `(userId, status, authoredOn)` for active medications
- MedicationAdministrations: `(userId, medicationRequestId, effectiveDateTime DESC)` for history
- FamilyConnections: `(patientUserId, status)` and `(caregiverUserId, status)` for relationships
- ReminderSchedules: `(userId, effectiveDate, endDate)` for active schedules

**Rationale for Top-Level Collection**:
- FamilyConnections: Involves two users (patient & caregiver); simpler queries at top level

---

## Data Model Patterns

### 1. Denormalization Strategy
**What**: Store `userId` and `profileId` in nested documents
**Why**: Faster queries without joins; Firestore doesn't support joins
**Trade-off**: Data duplication; must update in multiple places if user changes

### 2. Soft Deletes
**What**: `isArchived` or `isActive` flags instead of deleting documents
**Why**: Audit trail, accidental delete recovery, analytics
**Pattern**: Filter queries with `where('isActive', '==', true)`

### 3. Timestamps
**What**: Store `createdAt`, `updatedAt` as Firestore Timestamps
**Why**: Consistent timezone handling, sortable, server-side generation
**Pattern**: Use `serverTimestamp()` on create/update

### 4. Edit Window Enforcement
**What**: MedicationLog can only be edited within 24 hours
**Why**: Prevents data tampering, maintains audit integrity
**Implementation**: Security Rules check `resource.data.createdAt`

---

## Validation & Constraints

### Business Logic Constraints
1. **Medication frequency**:
   - Scheduled: `frequency.value >= 1`, `intakeTimes.length > 0`
   - PRN: `isPRN = true`, `frequency.value = null`, `prnInstructions` required

2. **Medication duration**:
   - Must have `startDate`
   - Can have `endDate` OR `durationDays` (not both)
   - If `durationDays`, calculate `endDate = startDate + durationDays`

3. **Family connections**:
   - Patient cannot be their own caregiver
   - One connection per (patient, caregiver, profile) tuple
   - Status transitions: pending → accepted/rejected → revoked

4. **Log edits**:
   - Only within 24 hours of creation
   - Track edit history for audit
   - Cannot edit after medication is marked complete

### Data Integrity
- **Referential integrity**: Firestore doesn't enforce FK; use Cloud Functions to cascade deletes
- **Uniqueness**: No built-in unique constraints; use transaction + conditional write
- **Atomicity**: Use batch writes for multi-document updates

---

## Migration & Versioning

### Schema Version
```typescript
interface SchemaVersion {
  version: number;                // e.g., 1
  appliedAt: Timestamp;
  description: string;
}
```
**Stored in**: `/system/schema_version`

### Migration Strategy
1. New fields: Add as optional (`field | null`), update TypeScript interfaces
2. Removed fields: Mark deprecated, remove from new writes, keep in reads for backward compatibility
3. Breaking changes: Increment major version, run migration script (Cloud Function)

---

## Performance Optimization

### Query Optimization
1. **Composite indexes**: Pre-create for common query patterns
   - Active medications: `(profileId, isActive, startDate)`
   - Recent logs: `(medicationId, actualTime DESC)`
   - Upcoming reminders: `(userId, nextTrigger ASC)`

2. **Pagination**: Limit queries to 50 results, use `startAfter` for infinite scroll

3. **Denormalization**: Store computed fields (e.g., `adherencePercentage`) to avoid aggregations

### Caching Strategy
1. **Local cache**: Firestore offline persistence (enabled by default)
2. **AsyncStorage**: Cache user preferences, language, theme
3. **Memory cache**: React Context for frequently accessed data (current profile, active medications)

---

## Testing Data Model

### Unit Tests (TypeScript)
```typescript
describe('Medication Model', () => {
  it('validates scheduled medication has intake times', () => {
    const med = { isPRN: false, frequency: { intakeTimes: [] } };
    expect(validateMedication(med)).toHaveError('intakeTimes required');
  });
  
  it('validates PRN medication has instructions', () => {
    const med = { isPRN: true, prnInstructions: null };
    expect(validateMedication(med)).toHaveError('prnInstructions required');
  });
});
```

### Contract Tests (Firestore Rules)
```typescript
describe('Medication Security Rules', () => {
  it('allows owner to read their medications', async () => {
    await assertSucceeds(
      db.collection('users/user1/profiles/prof1/medications')
        .doc('med1').get()
    );
  });
  
  it('denies non-owner from reading medications', async () => {
    await assertFails(
      db.collection('users/user1/profiles/prof1/medications')
        .doc('med1').get()
    );
  });
});
```

---

## Status

✅ Data model complete
✅ TypeScript interfaces defined
✅ Firestore security rules designed
✅ Indexes identified
✅ Validation rules documented

**Next Steps**: 
1. Create Firestore Security Rules file (`firestore.rules`)
2. Create Firestore Indexes file (`firestore.indexes.json`)
3. Generate API contracts in `contracts/` directory
