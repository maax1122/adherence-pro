import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type {
  ReminderSchedule,
  ReminderInstance,
  FHIRTiming,
  MedicationRequestDocument,
} from '@/types/fhir';
import { reminderScheduleConverter } from '@/services/firestore/converters';
import { getCurrentUserId } from '@/services/auth/authService';
import { getMedicationRequest } from '@/services/firestore/medicationRequestService';

const REMINDER_SCHEDULES_COLLECTION = 'reminder_schedules';
const PRECOMPUTE_DAYS = 30;
const REFRESH_THRESHOLD_DAYS = 7;

export interface CreateReminderScheduleData {
  medicationRequestId: string;
  startDate?: Date;
}

export interface UpdateReminderScheduleData {
  isEnabled?: boolean;
}

export interface UpcomingReminder {
  scheduleId: string;
  schedule: ReminderSchedule;
  instance: ReminderInstance;
}

export interface SnoozeReminderOptions {
  scheduleId: string;
  instanceId: string;
  minutes: number;
}

export async function createReminderSchedule(
  data: CreateReminderScheduleData
): Promise<ReminderSchedule> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to create reminder schedule');
  }

  const medicationRequest = await getMedication(data.medicationRequestId);
  if (!medicationRequest) {
    throw new Error('MedicationRequest not found');
  }

  if (medicationRequest.userId !== userId) {
    throw new Error('User does not have permission to create a schedule for this medication');
  }

  if (medicationRequest.isPRN) {
    throw new Error('Cannot create reminders for PRN medications');
  }

  const existingSchedule = await getReminderScheduleByMedicationRequest(data.medicationRequestId);
  if (existingSchedule) {
    throw new Error('ReminderSchedule already exists for this MedicationRequest');
  }

  const timing = medicationRequest.dosageInstruction?.[0]?.timing;
  if (!timing?.repeat) {
    throw new Error('MedicationRequest must include timing information to create reminders');
  }

  const scheduleRef = doc(collection(db, REMINDER_SCHEDULES_COLLECTION));
  const startDate = data.startDate ?? new Date();
  const instances = computeReminderInstances(timing, startDate, PRECOMPUTE_DAYS);
  const medicationName = resolveMedicationName(medicationRequest);
  const validUntil = formatDate(addDays(startDate, PRECOMPUTE_DAYS));

  const schedule: ReminderSchedule = {
    id: scheduleRef.id,
    userId,
    patientId: medicationRequest.patientId,
    medicationRequestId: data.medicationRequestId,
    medicationName,
    timing,
    isPRN: false,
    isEnabled: true,
    instances,
    generatedAt: Timestamp.now(),
    validUntil,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const firestorePayload = reminderScheduleConverter.toFirestore(schedule);
  await setDoc(scheduleRef, firestorePayload);

  const snapshot = await getDoc(scheduleRef);
  return reminderScheduleConverter.fromFirestore(snapshot);
}

export async function getReminderSchedule(scheduleId: string): Promise<ReminderSchedule | null> {
  const scheduleRef = doc(db, REMINDER_SCHEDULES_COLLECTION, scheduleId);
  const snapshot = await getDoc(scheduleRef);

  if (!snapshot.exists()) {
    return null;
  }

  return reminderScheduleConverter.fromFirestore(snapshot);
}

export async function getReminderScheduleByMedicationRequest(
  medicationRequestId: string
): Promise<ReminderSchedule | null> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to query reminders');
  }

  const reminderQuery = query(
    collection(db, REMINDER_SCHEDULES_COLLECTION),
    where('userId', '==', userId),
    where('medicationRequestId', '==', medicationRequestId)
  );

  const snapshot = await getDocs(reminderQuery);
  if (snapshot.empty) {
    return null;
  }

  return reminderScheduleConverter.fromFirestore(snapshot.docs[0]);
}

export async function getPatientReminderSchedules(patientId: string): Promise<ReminderSchedule[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to query reminders');
  }

  const reminderQuery = query(
    collection(db, REMINDER_SCHEDULES_COLLECTION),
    where('userId', '==', userId),
    where('patientId', '==', patientId),
    where('isEnabled', '==', true)
  );

  const snapshot = await getDocs(reminderQuery);
  return snapshot.docs.map((docSnapshot) => reminderScheduleConverter.fromFirestore(docSnapshot));
}

export async function getUpcomingReminders(
  patientId: string,
  hoursAhead = 24
): Promise<UpcomingReminder[]> {
  const schedules = await getPatientReminderSchedules(patientId);
  const now = new Date();
  const horizon = addHours(now, hoursAhead);

  const upcoming: UpcomingReminder[] = [];

  for (const schedule of schedules) {
    for (const instance of schedule.instances) {
      const scheduledTime = instance.effectiveDateTime.toDate();
      if (
        scheduledTime >= now &&
        scheduledTime <= horizon &&
        (instance.status === 'pending' || instance.status === 'sent')
      ) {
        upcoming.push({
          scheduleId: schedule.id,
          schedule,
          instance,
        });
      }
    }
  }

  upcoming.sort(
    (a, b) => a.instance.effectiveDateTime.toMillis() - b.instance.effectiveDateTime.toMillis()
  );

  return upcoming;
}

export async function markNotificationSent(
  scheduleId: string,
  instanceId: string,
  notificationId: string
): Promise<void> {
  await updateInstance(scheduleId, instanceId, (instance) => ({
    ...instance,
    status: 'sent',
    sentAt: Timestamp.now(),
    notificationId,
  }));
}

export async function markReminderCompleted(
  scheduleId: string,
  instanceId: string,
  medicationAdministrationId: string
): Promise<void> {
  await updateInstance(scheduleId, instanceId, (instance) => ({
    ...instance,
    status: 'completed',
    loggedAt: Timestamp.now(),
    medicationAdministrationId,
  }));
}

export async function markReminderMissed(scheduleId: string, instanceId: string): Promise<void> {
  await updateInstance(scheduleId, instanceId, (instance) => ({
    ...instance,
    status: 'missed',
  }));
}

export async function snoozeReminder(options: SnoozeReminderOptions): Promise<void> {
  const { scheduleId, instanceId, minutes } = options;
  await updateInstance(scheduleId, instanceId, (instance) => {
    const scheduled = addMinutes(instance.effectiveDateTime.toDate(), minutes);
    return {
      ...instance,
      effectiveDateTime: Timestamp.fromDate(scheduled),
      instanceDate: formatDate(scheduled),
      timeOfDay: formatTime(scheduled),
      status: 'pending',
      sentAt: null,
      notificationId: undefined,
    };
  });
}

export async function updateReminderSchedule(
  scheduleId: string,
  updates: UpdateReminderScheduleData
): Promise<ReminderSchedule> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to update reminder schedule');
  }

  const scheduleRef = doc(db, REMINDER_SCHEDULES_COLLECTION, scheduleId);
  const snapshot = await getDoc(scheduleRef);
  if (!snapshot.exists()) {
    throw new Error('ReminderSchedule not found');
  }

  const schedule = reminderScheduleConverter.fromFirestore(snapshot);
  if (schedule.userId !== userId) {
    throw new Error('User does not have permission to update this schedule');
  }

  await updateDoc(scheduleRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  const updatedSnapshot = await getDoc(scheduleRef);
  return reminderScheduleConverter.fromFirestore(updatedSnapshot);
}

export async function refreshReminderSchedule(scheduleId: string): Promise<ReminderSchedule> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to refresh reminder schedule');
  }

  const schedule = await getReminderSchedule(scheduleId);
  if (!schedule) {
    throw new Error('ReminderSchedule not found');
  }

  if (schedule.userId !== userId) {
    throw new Error('User does not have permission to refresh this schedule');
  }

  const daysRemaining = differenceInDays(new Date(schedule.validUntil), new Date());
  if (daysRemaining > REFRESH_THRESHOLD_DAYS) {
    return schedule;
  }

  const medicationRequest = await getMedication(schedule.medicationRequestId);
  if (!medicationRequest) {
    throw new Error('MedicationRequest not found');
  }

  const baseTiming = medicationRequest.dosageInstruction?.[0]?.timing ?? schedule.timing;
  const lastInstance = schedule.instances.length
    ? schedule.instances.reduce((latest, current) =>
        current.effectiveDateTime.toMillis() > latest.effectiveDateTime.toMillis() ? current : latest
      )
    : null;

  const startDate = lastInstance
    ? addDays(lastInstance.effectiveDateTime.toDate(), 1)
    : new Date();
  const newInstances = computeReminderInstances(baseTiming, startDate, PRECOMPUTE_DAYS);
  const mergedInstances = schedule.instances.length
    ? [...schedule.instances, ...newInstances]
    : newInstances;
  const validUntil = formatDate(addDays(startDate, PRECOMPUTE_DAYS));

  const scheduleRef = doc(db, REMINDER_SCHEDULES_COLLECTION, scheduleId);
  const sanitizedInstances = mergedInstances.map(sanitizeReminderInstance);

  await updateDoc(scheduleRef, {
    instances: sanitizedInstances,
    generatedAt: Timestamp.now(),
    validUntil,
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(scheduleRef);
  return reminderScheduleConverter.fromFirestore(snapshot);
}

export async function deleteReminderSchedule(scheduleId: string): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to delete reminder schedule');
  }

  const schedule = await getReminderSchedule(scheduleId);
  if (!schedule) {
    return;
  }

  if (schedule.userId !== userId) {
    throw new Error('User does not have permission to delete this schedule');
  }

  const scheduleRef = doc(db, REMINDER_SCHEDULES_COLLECTION, scheduleId);
  await deleteDoc(scheduleRef);
}

async function updateInstance(
  scheduleId: string,
  instanceId: string,
  transform: (instance: ReminderInstance) => ReminderInstance
): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to update reminder instances');
  }

  const scheduleRef = doc(db, REMINDER_SCHEDULES_COLLECTION, scheduleId);
  const snapshot = await getDoc(scheduleRef);
  if (!snapshot.exists()) {
    throw new Error('ReminderSchedule not found');
  }

  const schedule = reminderScheduleConverter.fromFirestore(snapshot);
  if (schedule.userId !== userId) {
    throw new Error('User does not have permission to update this schedule');
  }

  const updatedInstances = schedule.instances.map((instance) =>
    instance.id === instanceId ? sanitizeReminderInstance(transform(instance)) : instance
  );

  await updateDoc(scheduleRef, {
    instances: updatedInstances,
    updatedAt: serverTimestamp(),
  });
}

function computeReminderInstances(
  timing: FHIRTiming | undefined,
  startDate: Date,
  days: number
): ReminderInstance[] {
  if (!timing?.repeat) {
    return [];
  }

  const repeat = timing.repeat;
  const frequency = repeat.frequency ?? 1;
  const period = repeat.period ?? 1;
  const periodHours = resolvePeriodInHours(period, repeat.periodUnit ?? 'd');
  const timesOfDay = repeat.timeOfDay ?? [];
  const daysOfWeek = (repeat.dayOfWeek ?? []).map((day) => day.toLowerCase());
  const endDate = addDays(startDate, days);

  const instances: ReminderInstance[] = [];
  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    if (daysOfWeek.length > 0) {
      const dayOfWeek = cursor
        .toLocaleDateString('en-US', { weekday: 'short' })
        .toLowerCase();
      if (!daysOfWeek.includes(dayOfWeek)) {
        cursor = addDays(cursor, 1);
        continue;
      }
    }

    if (timesOfDay.length > 0) {
      for (const timeOfDay of timesOfDay) {
        const scheduled = applyTimeOfDay(cursor, timeOfDay);
        if (scheduled < startDate || scheduled > endDate) {
          continue;
        }
        instances.push(createInstance(scheduled));
      }
    } else {
      for (let iteration = 0; iteration < frequency; iteration += 1) {
        const scheduled = new Date(cursor);
        const offsetHours = (iteration * periodHours) / frequency;
        scheduled.setHours(scheduled.getHours() + offsetHours);
        if (scheduled < startDate || scheduled > endDate) {
          continue;
        }
        instances.push(createInstance(scheduled));
      }
    }

    cursor = addHours(cursor, periodHours);
  }

  return instances;
}

function createInstance(date: Date): ReminderInstance {
  return {
    id: `${date.getTime()}`,
    instanceDate: formatDate(date),
    timeOfDay: formatTime(date),
    effectiveDateTime: Timestamp.fromDate(date),
    status: 'pending',
  };
}

function sanitizeReminderInstance(instance: ReminderInstance): ReminderInstance {
  const sanitized: Record<string, unknown> = { ...instance };
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  return sanitized as ReminderInstance;
}

async function getMedication(id: string): Promise<MedicationRequestDocument | null> {
  return getMedicationRequest(id);
}

function resolveMedicationName(medication: MedicationRequestDocument): string {
  return (
    medication.medicationName ||
    medication.medicationCodeableConcept?.text ||
    medication.medicationCodeableConcept?.coding?.[0]?.display ||
    'Medication'
  );
}

function resolvePeriodInHours(period: number, periodUnit: string): number {
  switch (periodUnit) {
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
}

function applyTimeOfDay(base: Date, timeOfDay: string): Date {
  const [hours = '0', minutes = '0', seconds = '0'] = timeOfDay.split(':');
  const result = new Date(base);
  result.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), Number.parseInt(seconds, 10), 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

function differenceInDays(end: Date, start: Date): number {
  const milliseconds = end.getTime() - start.getTime();
  return Math.floor(milliseconds / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(date: Date): string {
  return date.toTimeString().split(' ')[0];
}
