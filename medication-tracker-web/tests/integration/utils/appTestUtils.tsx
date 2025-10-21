import { vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '@/App';
import type {
  PatientDocument,
  MedicationRequestDocument,
  MedicationAdministrationDocument,
} from '@/types/fhir';

const hoistedMocks = vi.hoisted(() => {
  const authStub = { currentUser: null as any };
  const listeners: Array<(user: any) => void> = [];

  const notifyAuthListeners = (user: any) => {
    authStub.currentUser = user;
    listeners.forEach((listener) => listener(user));
  };

  const createUserWithEmailAndPassword = vi.fn(
    async (_auth: any, email: string, _password: string) => {
      const user = {
        uid: 'user-123',
        email,
        displayName: '',
        providerId: 'password',
      };
      notifyAuthListeners(user);
      return { user };
    }
  );

  const updateProfile = vi.fn(async (user: any, updates: Record<string, unknown>) => {
    Object.assign(user, updates);
  });

  const signInWithEmailAndPassword = vi.fn(
    async (_auth: any, email: string, _password: string) => {
      const user =
        authStub.currentUser ??
        ({
          uid: 'user-123',
          email,
          displayName: 'John Doe',
          providerId: 'password',
        } as const);
      notifyAuthListeners(user);
      return { user };
    }
  );

  const signOut = vi.fn(async () => {
    notifyAuthListeners(null);
  });

  const sendPasswordResetEmail = vi.fn(async () => {});

  const signInWithPopup = vi.fn(async (_auth: any, _provider: any) => {
    const user =
      authStub.currentUser ??
      ({
        uid: 'user-123',
        email: 'john@example.com',
        displayName: 'John Doe',
        providerId: 'google.com',
      } as const);
    notifyAuthListeners(user);
    return { user };
  });

  class MockGoogleAuthProvider {
    setCustomParameters = vi.fn();
  }

  class MockAuthError extends Error {
    code: string;

    constructor(code: string, message?: string) {
      super(message ?? code);
      this.code = code;
    }
  }

  const onAuthStateChangedMock = (_auth: any, callback: (user: any) => void) => {
    listeners.push(callback);
    callback(authStub.currentUser);
    return () => {
      const index = listeners.indexOf(callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  };

  const mockPatients: PatientDocument[] = [];
  const mockMedications: MedicationRequestDocument[] = [];
  const mockLogs: MedicationAdministrationDocument[] = [];

  const createPatientMock = vi.fn(
    async (data: {
      name: string;
      birthDate?: string;
      gender?: PatientDocument['gender'];
      relationship?: PatientDocument['relationship'];
    }) => {
      const patient: PatientDocument = {
        resourceType: 'Patient',
        id: `patient-${mockPatients.length + 1}`,
        userId: 'user-123',
        active: true,
        name: [
          {
            text: data.name,
            given: data.name.split(' '),
          },
        ],
        birthDate: data.birthDate,
        gender: data.gender,
        relationship: data.relationship ?? 'self',
      };
      mockPatients.unshift(patient);
      return patient;
    }
  );

  const getUserPatientsMock = vi.fn(async () => [...mockPatients]);

  const getPatientMedicationRequestsMock = vi.fn(
    async (patientId: string) =>
      mockMedications.filter((medication) => medication.patientId === patientId)
  );

  const createMedicationRequestMock = vi.fn(
    async (data: {
      patientId: string;
      medicationName: string;
      dosageInstruction?: MedicationRequestDocument['dosageInstruction'];
      isPRN?: boolean;
      priority?: MedicationRequestDocument['priority'];
      dispenseRequest?: MedicationRequestDocument['dispenseRequest'];
    }) => {
      const medication: MedicationRequestDocument = {
        resourceType: 'MedicationRequest',
        id: `med-${mockMedications.length + 1}`,
        userId: 'user-123',
        patientId: data.patientId,
        medicationName: data.medicationName,
        status: 'active',
        intent: 'order',
        priority: data.priority,
        dosageInstruction: data.dosageInstruction ?? [],
        isPRN: data.isPRN ?? false,
        medicationCodeableConcept: { text: data.medicationName },
        subject: { reference: `Patient/${data.patientId}` },
        dispenseRequest: data.dispenseRequest,
      };
      mockMedications.unshift(medication);
      return medication;
    }
  );

  const updateMedicationRequestMock = vi.fn(
    async (requestId: string, updates: Partial<MedicationRequestDocument>) => {
      const target = mockMedications.find((medication) => medication.id === requestId);
      if (target) {
        Object.assign(target, updates);
      }
      return target;
    }
  );

  const deleteMedicationRequestMock = vi.fn(async (requestId: string) => {
    const target = mockMedications.find((medication) => medication.id === requestId);
    if (target) {
      target.status = 'cancelled';
    }
  });

  const logMedicationMock = vi.fn(async (data: { medicationRequestId: string }) => {
    const medication = mockMedications.find((item) => item.id === data.medicationRequestId);
    if (!medication) {
      throw new Error('Medication not found');
    }

    const logEntry: MedicationAdministrationDocument = {
      resourceType: 'MedicationAdministration',
      id: `log-${Date.now()}`,
      userId: medication.userId,
      patientId: medication.patientId,
      medicationRequestId: medication.id,
      status: 'completed',
      medicationCodeableConcept: { text: medication.medicationName },
      effectiveDateTime: new Date().toISOString(),
      note: [
        {
          text: 'Dose logged via integration test',
          time: new Date().toISOString(),
        },
      ],
    };

    mockLogs.unshift(logEntry);
  });

  const getPatientMedicationLogsMock = vi.fn(
    async (patientId: string) => mockLogs.filter((log) => log.patientId === patientId)
  );

  return {
    authStub,
    authStateListeners: listeners,
    notifyAuthListeners,
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    signInWithPopup,
    GoogleAuthProvider: MockGoogleAuthProvider,
    onAuthStateChangedMock,
    MockAuthError,
    mockPatients,
    mockMedications,
    mockLogs,
    getUserPatientsMock,
    createPatientMock,
    getPatientMedicationRequestsMock,
    createMedicationRequestMock,
    updateMedicationRequestMock,
    deleteMedicationRequestMock,
    logMedicationMock,
    getPatientMedicationLogsMock,
  };
});

export const authStub = hoistedMocks.authStub;
export const authStateListeners = hoistedMocks.authStateListeners;
export const notifyAuthListeners = hoistedMocks.notifyAuthListeners;
export const createUserWithEmailAndPassword = hoistedMocks.createUserWithEmailAndPassword;
export const updateProfile = hoistedMocks.updateProfile;
export const signInWithEmailAndPassword = hoistedMocks.signInWithEmailAndPassword;
export const signOut = hoistedMocks.signOut;
export const sendPasswordResetEmail = hoistedMocks.sendPasswordResetEmail;
export const signInWithPopup = hoistedMocks.signInWithPopup;
export const GoogleAuthProvider = hoistedMocks.GoogleAuthProvider;
export const onAuthStateChangedMock = hoistedMocks.onAuthStateChangedMock;
export const MockAuthError = hoistedMocks.MockAuthError;
export const mockPatients = hoistedMocks.mockPatients;
export const mockMedications = hoistedMocks.mockMedications;
export const mockLogs = hoistedMocks.mockLogs;
export const getUserPatientsMock = hoistedMocks.getUserPatientsMock;
export const getPatientMedicationRequestsMock = hoistedMocks.getPatientMedicationRequestsMock;
export const updateMedicationRequestMock = hoistedMocks.updateMedicationRequestMock;
export const deleteMedicationRequestMock = hoistedMocks.deleteMedicationRequestMock;
export const logMedicationMock = hoistedMocks.logMedicationMock;
export const getPatientMedicationLogsMock = hoistedMocks.getPatientMedicationLogsMock;
export const createPatientMock = hoistedMocks.createPatientMock;
export const createMedicationRequestMock = hoistedMocks.createMedicationRequestMock;

vi.mock('@/config/firebase', () => ({
  app: {},
  auth: hoistedMocks.authStub,
  db: {},
  messaging: null,
}));

vi.mock('firebase/auth', () => {
  const {
    onAuthStateChangedMock,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    signInWithPopup,
    GoogleAuthProvider,
    MockAuthError,
  } = hoistedMocks;

  return {
    onAuthStateChanged: onAuthStateChangedMock,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    signInWithPopup,
    GoogleAuthProvider,
    AuthError: MockAuthError,
  };
});

let mockedGetPatient: ((id: string) => PatientDocument | null) | null = null;

vi.mock('@/services/firestore/patientService', () => ({
  getUserPatients: hoistedMocks.getUserPatientsMock,
  createPatient: hoistedMocks.createPatientMock,
  getPatient: async (id: string) => {
    if (mockedGetPatient) {
      return mockedGetPatient(id);
    }
    return (
      hoistedMocks.mockPatients.find((patient) => patient.id === id) ?? null
    );
  },
}));

vi.mock('@/services/firestore/medicationRequestService', () => ({
  getPatientMedicationRequests: hoistedMocks.getPatientMedicationRequestsMock,
  createMedicationRequest: hoistedMocks.createMedicationRequestMock,
  updateMedicationRequest: hoistedMocks.updateMedicationRequestMock,
  deleteMedicationRequest: hoistedMocks.deleteMedicationRequestMock,
}));

vi.mock('@/services/firestore/medicationAdministrationService', () => ({
  logMedication: hoistedMocks.logMedicationMock,
  getPatientMedicationLogs: hoistedMocks.getPatientMedicationLogsMock,
}));

export const resetTestState = () => {
  mockPatients.length = 0;
  mockMedications.length = 0;
  mockLogs.length = 0;
  authStub.currentUser = null;
  authStateListeners.splice(0, authStateListeners.length);
  mockedGetPatient = null;

  createUserWithEmailAndPassword.mockClear();
  updateProfile.mockClear();
  signInWithEmailAndPassword.mockClear();
  signOut.mockClear();
  sendPasswordResetEmail.mockClear();
  signInWithPopup.mockClear();
  createPatientMock.mockClear();
  createMedicationRequestMock.mockClear();

  getUserPatientsMock.mockClear();
  getPatientMedicationRequestsMock.mockClear();
  updateMedicationRequestMock.mockClear();
  deleteMedicationRequestMock.mockClear();
  logMedicationMock.mockClear();
  getPatientMedicationLogsMock.mockClear();
};

export const seedPatients = (patients: PatientDocument[]) => {
  mockPatients.push(...patients);
};

export const seedMedications = (medications: MedicationRequestDocument[]) => {
  mockMedications.push(...medications);
};

export const seedMedicationLogs = (logs: MedicationAdministrationDocument[]) => {
  mockLogs.push(...logs);
};

export const setPatientLookup = (lookup: ((id: string) => PatientDocument | null) | null) => {
  mockedGetPatient = lookup;
};

export const setAuthUser = (user: {
  uid: string;
  email?: string;
  displayName?: string;
  providerId?: string;
}) => {
  notifyAuthListeners({
    providerId: 'password',
    ...user,
  });
};

export const renderAppAt = (initialRoute: string) => {
  window.history.pushState({}, 'Test page', initialRoute);
  return render(<App />);
};
