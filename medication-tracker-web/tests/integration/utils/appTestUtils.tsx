import { vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '@/App';
import type {
  PatientDocument,
  MedicationRequestDocument,
  MedicationAdministrationDocument,
  FamilyConnection,
  ReminderSchedule,
  ReminderInstance,
  FHIRTiming,
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

  class MockTimestamp {
    private readonly date: Date;

    constructor(date: Date) {
      this.date = date;
    }

    toDate() {
      return this.date;
    }

    toMillis() {
      return this.date.getTime();
    }
  }

  const createMockTimestamp = (value?: Date | string | number) => {
    if (value instanceof Date) {
      return new MockTimestamp(new Date(value.getTime()));
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return new MockTimestamp(new Date(value));
    }

    return new MockTimestamp(new Date());
  };

  const cloneTimestamp = (timestamp?: { toDate: () => Date } | null) => {
    if (!timestamp) {
      return undefined;
    }
    return createMockTimestamp(timestamp.toDate());
  };

  const mockConnections: FamilyConnection[] = [];
  const mockReminderSchedules: ReminderSchedule[] = [];

  const cloneConnection = (connection: FamilyConnection): FamilyConnection => {
    return {
      ...connection,
      permissions: [...connection.permissions],
      invitedAt: createMockTimestamp(connection.invitedAt.toDate()),
      acceptedAt: cloneTimestamp(connection.acceptedAt ?? null),
      rejectedAt: cloneTimestamp(connection.rejectedAt ?? null),
      revokedAt: cloneTimestamp(connection.revokedAt ?? null),
    };
  };

  const findConnection = (connectionId: string) =>
    mockConnections.find((connection) => connection.id === connectionId);

  const createInvitationMock = vi.fn(
    async ({
      patientId,
      caregiverEmail,
      permissions,
    }: {
      patientId: string;
      caregiverEmail: string;
      permissions: FamilyConnection['permissions'];
    }) => {
      const normalizedEmail = caregiverEmail.trim().toLowerCase();
      const existing = mockConnections.find(
        (connection) =>
          connection.patientId === patientId &&
          connection.caregiverEmailLowercase === normalizedEmail &&
          connection.status !== 'rejected' &&
          connection.status !== 'revoked'
      );

      if (existing) {
        throw new Error('Invitation already exists for this caregiver');
      }

      const now = createMockTimestamp();
      const connection: FamilyConnection = {
        id: `connection-${mockConnections.length + 1}`,
        patientUserId: authStub.currentUser?.uid ?? 'user-123',
        caregiverUserId: '',
        caregiverEmail: caregiverEmail.trim(),
        caregiverEmailLowercase: normalizedEmail,
        patientId,
        status: 'pending',
        permissions: [...permissions],
        invitedAt: now,
        invitedBy: authStub.currentUser?.uid ?? 'user-123',
        acceptedAt: undefined,
        rejectedAt: undefined,
        revokedAt: undefined,
      };

      mockConnections.push(connection);
      return cloneConnection(connection);
    }
  );

  const getPatientConnectionsMock = vi.fn(async (patientId: string) =>
    mockConnections
      .filter((connection) => connection.patientId === patientId)
      .map(cloneConnection)
  );

  const getCaregiverConnectionsMock = vi.fn(async (userId?: string) => {
    const targetUserId = userId ?? authStub.currentUser?.uid;
    if (!targetUserId) {
      return [];
    }

    return mockConnections
      .filter(
        (connection) =>
          connection.status === 'accepted' && connection.caregiverUserId === targetUserId
      )
      .map(cloneConnection);
  });

  const getPendingInvitationsForEmailMock = vi.fn(async (email: string) => {
    const normalized = email.trim().toLowerCase();
    return mockConnections
      .filter(
        (connection) =>
          connection.caregiverEmailLowercase === normalized && connection.status === 'pending'
      )
      .map(cloneConnection);
  });

  const getPendingInvitationsForCurrentUserMock = vi.fn(async () => {
    const email = authStub.currentUser?.email;
    if (!email) {
      return [];
    }
    return getPendingInvitationsForEmailMock(email);
  });

  const acceptInvitationMock = vi.fn(async (connectionId: string) => {
    const connection = findConnection(connectionId);
    if (!connection) {
      throw new Error('Invitation not found');
    }

    if (connection.status !== 'pending') {
      throw new Error('Invitation already processed');
    }

    const caregiverUserId = authStub.currentUser?.uid ?? 'caregiver-uid';
    connection.caregiverUserId = caregiverUserId;
    connection.status = 'accepted';
    connection.acceptedAt = createMockTimestamp();
    connection.rejectedAt = undefined;
    connection.revokedAt = undefined;

    return cloneConnection(connection);
  });

  const rejectInvitationMock = vi.fn(async (connectionId: string) => {
    const connection = findConnection(connectionId);
    if (!connection) {
      throw new Error('Invitation not found');
    }

    if (connection.status !== 'pending') {
      throw new Error('Invitation already processed');
    }

    const caregiverUserId = authStub.currentUser?.uid ?? 'caregiver-uid';
    connection.caregiverUserId = caregiverUserId;
    connection.status = 'rejected';
    connection.rejectedAt = createMockTimestamp();
    connection.acceptedAt = undefined;
    connection.revokedAt = undefined;

    return cloneConnection(connection);
  });

  const revokeConnectionMock = vi.fn(async (connectionId: string) => {
    const connection = findConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    connection.status = 'revoked';
    connection.revokedAt = createMockTimestamp();
    return cloneConnection(connection);
  });

  const updatePermissionsMock = vi.fn(
    async (connectionId: string, data: { permissions: FamilyConnection['permissions'] }) => {
      const connection = findConnection(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      connection.permissions = [...data.permissions];
      return cloneConnection(connection);
    }
  );

  const getConnectionMock = vi.fn(async (connectionId: string) => {
    const connection = findConnection(connectionId);
    return connection ? cloneConnection(connection) : null;
  });

  const getConnectionByPatientAndCaregiverEmailMock = vi.fn(
    async (patientId: string, caregiverEmail: string) => {
      const normalized = caregiverEmail.trim().toLowerCase();
      const connection = mockConnections.find(
        (item) =>
          item.patientId === patientId && item.caregiverEmailLowercase === normalized
      );
      return connection ? cloneConnection(connection) : null;
    }
  );

  const canCaregiverLogMock = vi.fn(async (caregiverUserId: string, patientId: string) => {
    return mockConnections.some(
      (connection) =>
        connection.patientId === patientId &&
        connection.caregiverUserId === caregiverUserId &&
        connection.status === 'accepted' &&
        connection.permissions.includes('can_log')
    );
  });

  const canCaregiverViewMock = vi.fn(async (caregiverUserId: string, patientId: string) => {
    return mockConnections.some(
      (connection) =>
        connection.patientId === patientId &&
        connection.caregiverUserId === caregiverUserId &&
        connection.status === 'accepted'
    );
  });

  const computeReminderInstances = (
    timing: FHIRTiming | undefined,
    startDate: Date,
    days: number
  ): ReminderInstance[] => {
    if (!timing?.repeat) {
      return [];
    }

    const repeat = timing.repeat;
    const frequency = repeat.frequency ?? 1;
    const period = repeat.period ?? 1;
    const periodUnit = repeat.periodUnit ?? 'd';
    const timesOfDay = repeat.timeOfDay ?? [];
    const daysOfWeek = (repeat.dayOfWeek ?? []).map((day) => day.toLowerCase());
    const periodHours = resolvePeriodInHours(period, periodUnit);

    const endDate = addDays(startDate, days);
    const instances: ReminderInstance[] = [];
    let cursor = new Date(startDate);

    while (cursor <= endDate) {
      if (daysOfWeek.length) {
        const dayLabel = cursor.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
        if (!daysOfWeek.includes(dayLabel)) {
          cursor = addDays(cursor, 1);
          continue;
        }
      }

      if (timesOfDay.length) {
        for (const timeOfDay of timesOfDay) {
          const scheduled = applyTimeOfDay(cursor, timeOfDay);
          if (scheduled < startDate || scheduled > endDate) {
            continue;
          }
          instances.push(createReminderInstance(scheduled));
        }
      } else {
        for (let iteration = 0; iteration < frequency; iteration += 1) {
          const scheduled = new Date(cursor);
          const offsetHours = (iteration * periodHours) / frequency;
          scheduled.setHours(scheduled.getHours() + offsetHours);
          if (scheduled < startDate || scheduled > endDate) {
            continue;
          }
          instances.push(createReminderInstance(scheduled));
        }
      }

      cursor = addHours(cursor, periodHours);
    }

    return instances;
  };

  const createReminderScheduleMock = vi.fn(
    async ({ medicationRequestId, startDate }: { medicationRequestId: string; startDate?: Date }) => {
      const medication = hoistedMocks.mockMedications.find((item) => item.id === medicationRequestId);
      if (!medication) {
        throw new Error('MedicationRequest not found');
      }

      const userId = hoistedMocks.authStub.currentUser?.uid ?? medication.userId;
      const schedule: ReminderSchedule = {
        id: `schedule-${mockReminderSchedules.length + 1}`,
        userId,
        patientId: medication.patientId,
        medicationRequestId,
        medicationName: medication.medicationName,
        timing: medication.dosageInstruction?.[0]?.timing ?? {
          repeat: {
            frequency: 1,
            period: 1,
            periodUnit: 'd',
            timeOfDay: ['08:00'],
          },
        },
        isPRN: Boolean(medication.isPRN),
        isEnabled: true,
        instances: computeReminderInstances(
          medication.dosageInstruction?.[0]?.timing,
          startDate ?? new Date(),
          30
        ),
        generatedAt: createMockTimestamp(),
        validUntil: formatDate(addDays(startDate ?? new Date(), 30)),
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp(),
      };

      mockReminderSchedules.push(schedule);
      return cloneReminderSchedule(schedule);
    }
  );

  const getReminderScheduleByMedicationRequestMock = vi.fn(
    async (medicationRequestId: string) => {
      const schedule = mockReminderSchedules.find(
        (item) => item.medicationRequestId === medicationRequestId
      );
      return schedule ? cloneReminderSchedule(schedule) : null;
    }
  );

  const getPatientReminderSchedulesMock = vi.fn(async (patientId: string) =>
    mockReminderSchedules
      .filter((schedule) => schedule.patientId === patientId && schedule.isEnabled)
      .map(cloneReminderSchedule)
  );

  const getUpcomingRemindersMock = vi.fn(async (patientId: string, hoursAhead = 24) => {
    const schedules = await getPatientReminderSchedulesMock(patientId);
    const now = Date.now();
    const horizon = now + hoursAhead * 60 * 60 * 1000;

    const upcoming: Array<{ scheduleId: string; schedule: ReminderSchedule; instance: ReminderInstance }> = [];

    schedules.forEach((schedule) => {
      schedule.instances.forEach((instance) => {
        const scheduled = instance.effectiveDateTime.toDate().getTime();
        if (
          scheduled >= now &&
          scheduled <= horizon &&
          (instance.status === 'pending' || instance.status === 'sent')
        ) {
          upcoming.push({
            scheduleId: schedule.id,
            schedule,
            instance,
          });
        }
      });
    });

    upcoming.sort(
      (a, b) => a.instance.effectiveDateTime.toDate().getTime() - b.instance.effectiveDateTime.toDate().getTime()
    );

    return upcoming;
  });

  const markReminderCompletedMock = vi.fn(
    async (scheduleId: string, instanceId: string, administrationId: string) => {
      const schedule = mockReminderSchedules.find((item) => item.id === scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }
      schedule.instances = schedule.instances.map((instance) =>
        instance.id === instanceId
          ? {
              ...instance,
              status: 'completed',
              loggedAt: createMockTimestamp(),
              medicationAdministrationId: administrationId,
            }
          : instance
      );
      schedule.updatedAt = createMockTimestamp();
    }
  );

  const markReminderMissedMock = vi.fn(async (scheduleId: string, instanceId: string) => {
    const schedule = mockReminderSchedules.find((item) => item.id === scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    schedule.instances = schedule.instances.map((instance) =>
      instance.id === instanceId
        ? {
            ...instance,
            status: 'missed',
          }
        : instance
    );
    schedule.updatedAt = createMockTimestamp();
  });

  const snoozeReminderMock = vi.fn(async ({ scheduleId, instanceId, minutes }: { scheduleId: string; instanceId: string; minutes: number }) => {
    const schedule = mockReminderSchedules.find((item) => item.id === scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    schedule.instances = schedule.instances.map((instance) => {
      if (instance.id !== instanceId) {
        return instance;
      }
      const scheduled = addMinutes(instance.effectiveDateTime.toDate(), minutes);
      return {
        ...instance,
        effectiveDateTime: createMockTimestamp(scheduled),
        instanceDate: formatDate(scheduled),
        timeOfDay: formatTime(scheduled),
        status: 'pending',
        sentAt: null,
      };
    });
    schedule.updatedAt = createMockTimestamp();
  });

  const cloneReminderSchedule = (schedule: ReminderSchedule): ReminderSchedule => ({
    ...schedule,
    instances: schedule.instances.map(cloneReminderInstance),
    generatedAt: schedule.generatedAt ? createMockTimestamp(schedule.generatedAt.toDate()) : undefined,
    createdAt: schedule.createdAt ? createMockTimestamp(schedule.createdAt.toDate()) : undefined,
    updatedAt: schedule.updatedAt ? createMockTimestamp(schedule.updatedAt.toDate()) : undefined,
  });

  const cloneReminderInstance = (instance: ReminderInstance): ReminderInstance => ({
    ...instance,
    effectiveDateTime: createMockTimestamp(instance.effectiveDateTime.toDate()),
    sentAt: instance.sentAt ? createMockTimestamp(instance.sentAt.toDate()) : undefined,
    loggedAt: instance.loggedAt ? createMockTimestamp(instance.loggedAt.toDate()) : undefined,
  });

  const createReminderInstance = (date: Date): ReminderInstance => ({
    id: `${date.getTime()}`,
    instanceDate: formatDate(date),
    timeOfDay: formatTime(date),
    effectiveDateTime: createMockTimestamp(date),
    status: 'pending',
  });

  const resolvePeriodInHours = (period: number, unit: string): number => {
    switch (unit) {
      case 's':
        return period / 3600;
      case 'min':
        return period / 60;
      case 'h':
        return period;
      case 'wk':
        return period * 24 * 7;
      case 'mo':
        return period * 24 * 30;
      case 'a':
        return period * 24 * 365;
      case 'd':
      default:
        return period * 24;
    }
  };

  const applyTimeOfDay = (base: Date, timeOfDay: string): Date => {
    const [hours = '0', minutes = '0', seconds = '0'] = timeOfDay.split(':');
    const date = new Date(base);
    date.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), Number.parseInt(seconds, 10), 0);
    return date;
  };

  const addMinutes = (date: Date, minutes: number): Date => {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  };

  const addHours = (date: Date, hours: number): Date => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  };

  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

  const formatTime = (date: Date): string => date.toTimeString().split(' ')[0];

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

    const timestamp = createMockTimestamp();
    const performerId = authStub.currentUser?.uid ?? medication.userId;
    const performerRole = performerId === medication.userId ? 'patient' : 'caregiver';
    const performerName =
      authStub.currentUser?.displayName ?? authStub.currentUser?.email ?? 'Caregiver';

    const logEntry: MedicationAdministrationDocument = {
      resourceType: 'MedicationAdministration',
      id: `log-${Date.now()}`,
      userId: medication.userId,
      patientId: medication.patientId,
      medicationRequestId: medication.id,
      status: 'completed',
       administrationStatus: 'taken',
      medicationCodeableConcept: { text: medication.medicationName },
      effectiveDateTime: timestamp,
      actualTime: timestamp,
      performedBy: performerId,
      performedByRole: performerRole,
      performedByName: performerName,
      note: [
        {
          text: 'Dose logged via integration test',
          time: new Date().toISOString(),
        },
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockLogs.unshift(logEntry);
    return logEntry;
  });

  const getPatientMedicationLogsMock = vi.fn(
    async (patientId: string) => mockLogs.filter((log) => log.patientId === patientId)
  );

  const notifyScheduleReminderMock = vi.fn(async () => {});
  const notifyCaregiverInvitationSentMock = vi.fn(async () => {});
  const notifyCaregiverInvitationAcceptedMock = vi.fn(async () => {});
  const notifyCaregiverMissedDoseMock = vi.fn(async () => {});
  const showLocalNotificationMock = vi.fn(async () => {});
  const requestNotificationPermissionMock = vi.fn(async () => 'granted' as NotificationPermission);
  const getMessagingTokenMock = vi.fn(async () => 'mock-token');
  const listenForForegroundMessagesMock = vi.fn(() => () => undefined);
  const markNotificationSentMock = vi.fn(async () => {});

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
    createMockTimestamp,
    mockPatients,
    mockMedications,
    mockLogs,
    mockConnections,
    mockReminderSchedules,
    getUserPatientsMock,
    createPatientMock,
    getPatientMedicationRequestsMock,
    createMedicationRequestMock,
    updateMedicationRequestMock,
    deleteMedicationRequestMock,
    logMedicationMock,
    getPatientMedicationLogsMock,
    createInvitationMock,
    getPatientConnectionsMock,
    getCaregiverConnectionsMock,
    getPendingInvitationsForEmailMock,
    getPendingInvitationsForCurrentUserMock,
    acceptInvitationMock,
    rejectInvitationMock,
    revokeConnectionMock,
    updatePermissionsMock,
    getConnectionMock,
    getConnectionByPatientAndCaregiverEmailMock,
    canCaregiverLogMock,
    canCaregiverViewMock,
    createReminderScheduleMock,
    getReminderScheduleByMedicationRequestMock,
    getPatientReminderSchedulesMock,
    getUpcomingRemindersMock,
    markReminderCompletedMock,
    markReminderMissedMock,
    snoozeReminderMock,
    notifyScheduleReminderMock,
    markNotificationSentMock,
    notifyCaregiverInvitationSentMock,
    notifyCaregiverInvitationAcceptedMock,
    notifyCaregiverMissedDoseMock,
    showLocalNotificationMock,
    requestNotificationPermissionMock,
    getMessagingTokenMock,
    listenForForegroundMessagesMock,
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
export const createMockTimestamp = hoistedMocks.createMockTimestamp;
export const mockPatients = hoistedMocks.mockPatients;
export const mockMedications = hoistedMocks.mockMedications;
export const mockLogs = hoistedMocks.mockLogs;
export const mockConnections = hoistedMocks.mockConnections;
export const mockReminderSchedules = hoistedMocks.mockReminderSchedules;
export const getUserPatientsMock = hoistedMocks.getUserPatientsMock;
export const getPatientMedicationRequestsMock = hoistedMocks.getPatientMedicationRequestsMock;
export const updateMedicationRequestMock = hoistedMocks.updateMedicationRequestMock;
export const deleteMedicationRequestMock = hoistedMocks.deleteMedicationRequestMock;
export const logMedicationMock = hoistedMocks.logMedicationMock;
export const getPatientMedicationLogsMock = hoistedMocks.getPatientMedicationLogsMock;
export const createPatientMock = hoistedMocks.createPatientMock;
export const createMedicationRequestMock = hoistedMocks.createMedicationRequestMock;
export const createInvitationMock = hoistedMocks.createInvitationMock;
export const getPatientConnectionsMock = hoistedMocks.getPatientConnectionsMock;
export const getCaregiverConnectionsMock = hoistedMocks.getCaregiverConnectionsMock;
export const getPendingInvitationsForEmailMock = hoistedMocks.getPendingInvitationsForEmailMock;
export const getPendingInvitationsForCurrentUserMock =
  hoistedMocks.getPendingInvitationsForCurrentUserMock;
export const acceptInvitationMock = hoistedMocks.acceptInvitationMock;
export const rejectInvitationMock = hoistedMocks.rejectInvitationMock;
export const revokeConnectionMock = hoistedMocks.revokeConnectionMock;
export const updatePermissionsMock = hoistedMocks.updatePermissionsMock;
export const getConnectionMock = hoistedMocks.getConnectionMock;
export const getConnectionByPatientAndCaregiverEmailMock =
  hoistedMocks.getConnectionByPatientAndCaregiverEmailMock;
export const canCaregiverLogMock = hoistedMocks.canCaregiverLogMock;
export const canCaregiverViewMock = hoistedMocks.canCaregiverViewMock;
export const createReminderScheduleMock = hoistedMocks.createReminderScheduleMock;
export const getReminderScheduleByMedicationRequestMock =
  hoistedMocks.getReminderScheduleByMedicationRequestMock;
export const getPatientReminderSchedulesMock = hoistedMocks.getPatientReminderSchedulesMock;
export const getUpcomingRemindersMock = hoistedMocks.getUpcomingRemindersMock;
export const markReminderCompletedMock = hoistedMocks.markReminderCompletedMock;
export const markReminderMissedMock = hoistedMocks.markReminderMissedMock;
export const snoozeReminderMock = hoistedMocks.snoozeReminderMock;
export const notifyScheduleReminderMock = hoistedMocks.notifyScheduleReminderMock;
export const markNotificationSentMock = hoistedMocks.markNotificationSentMock;
export const notifyCaregiverInvitationSentMock =
  hoistedMocks.notifyCaregiverInvitationSentMock;
export const notifyCaregiverInvitationAcceptedMock =
  hoistedMocks.notifyCaregiverInvitationAcceptedMock;
export const notifyCaregiverMissedDoseMock = hoistedMocks.notifyCaregiverMissedDoseMock;
export const showLocalNotificationMock = hoistedMocks.showLocalNotificationMock;
export const requestNotificationPermissionMock =
  hoistedMocks.requestNotificationPermissionMock;
export const getMessagingTokenMock = hoistedMocks.getMessagingTokenMock;
export const listenForForegroundMessagesMock =
  hoistedMocks.listenForForegroundMessagesMock;

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

vi.mock('@/services/firestore/familyConnectionService', () => ({
  createInvitation: hoistedMocks.createInvitationMock,
  getPatientConnections: hoistedMocks.getPatientConnectionsMock,
  getCaregiverConnections: hoistedMocks.getCaregiverConnectionsMock,
  getPendingInvitationsForEmail: hoistedMocks.getPendingInvitationsForEmailMock,
  getPendingInvitationsForCurrentUser: hoistedMocks.getPendingInvitationsForCurrentUserMock,
  acceptInvitation: hoistedMocks.acceptInvitationMock,
  rejectInvitation: hoistedMocks.rejectInvitationMock,
  revokeConnection: hoistedMocks.revokeConnectionMock,
  updatePermissions: hoistedMocks.updatePermissionsMock,
  getConnection: hoistedMocks.getConnectionMock,
  getConnectionByPatientAndCaregiverEmail: hoistedMocks.getConnectionByPatientAndCaregiverEmailMock,
  canCaregiverLog: hoistedMocks.canCaregiverLogMock,
  canCaregiverView: hoistedMocks.canCaregiverViewMock,
}));

vi.mock('@/services/notifications/notificationService', () => ({
  notifyScheduleReminder: hoistedMocks.notifyScheduleReminderMock,
  notifyCaregiverInvitationSent: hoistedMocks.notifyCaregiverInvitationSentMock,
  notifyCaregiverInvitationAccepted: hoistedMocks.notifyCaregiverInvitationAcceptedMock,
  notifyCaregiverMissedDose: hoistedMocks.notifyCaregiverMissedDoseMock,
  showLocalNotification: hoistedMocks.showLocalNotificationMock,
  requestNotificationPermission: hoistedMocks.requestNotificationPermissionMock,
  getMessagingToken: hoistedMocks.getMessagingTokenMock,
  listenForForegroundMessages: hoistedMocks.listenForForegroundMessagesMock,
  markNotificationSent: hoistedMocks.markNotificationSentMock,
}));

vi.mock('@/services/reminders/reminderService', () => ({
  createReminderSchedule: hoistedMocks.createReminderScheduleMock,
  getReminderScheduleByMedicationRequest: hoistedMocks.getReminderScheduleByMedicationRequestMock,
  getPatientReminderSchedules: hoistedMocks.getPatientReminderSchedulesMock,
  getUpcomingReminders: hoistedMocks.getUpcomingRemindersMock,
  markReminderCompleted: hoistedMocks.markReminderCompletedMock,
  markReminderMissed: hoistedMocks.markReminderMissedMock,
  snoozeReminder: hoistedMocks.snoozeReminderMock,
  markNotificationSent: hoistedMocks.markNotificationSentMock,
}));

export const resetTestState = () => {
  mockPatients.length = 0;
  mockMedications.length = 0;
  mockLogs.length = 0;
  mockConnections.length = 0;
  mockReminderSchedules.length = 0;
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
  createInvitationMock.mockClear();
  getPatientConnectionsMock.mockClear();
  getCaregiverConnectionsMock.mockClear();
  getPendingInvitationsForEmailMock.mockClear();
  getPendingInvitationsForCurrentUserMock.mockClear();
  acceptInvitationMock.mockClear();
  rejectInvitationMock.mockClear();
  revokeConnectionMock.mockClear();
  updatePermissionsMock.mockClear();
  getConnectionMock.mockClear();
  getConnectionByPatientAndCaregiverEmailMock.mockClear();
  canCaregiverLogMock.mockClear();
  canCaregiverViewMock.mockClear();
  createReminderScheduleMock.mockClear();
  getReminderScheduleByMedicationRequestMock.mockClear();
  getPatientReminderSchedulesMock.mockClear();
  getUpcomingRemindersMock.mockClear();
  markReminderCompletedMock.mockClear();
  markReminderMissedMock.mockClear();
  snoozeReminderMock.mockClear();
  notifyScheduleReminderMock.mockClear();
  markNotificationSentMock.mockClear();
  notifyCaregiverInvitationSentMock.mockClear();
  notifyCaregiverInvitationAcceptedMock.mockClear();
  notifyCaregiverMissedDoseMock.mockClear();
  showLocalNotificationMock.mockClear();
  requestNotificationPermissionMock.mockClear();
  getMessagingTokenMock.mockClear();
  listenForForegroundMessagesMock.mockClear();
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
