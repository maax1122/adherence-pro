/**
 * ReminderSchedule Service (Reminder Instance Management)
 * 
 * Manages ReminderSchedule documents in Firestore.
 * Pre-computes 30 days of reminder notification instances from MedicationRequest.timing.
 * 
 * Collection path: /reminder_schedules/{scheduleId}
 * 
 * Security: All operations require userId match with authenticated user
 */

import firestore from '@react-native-firebase/firestore';
import type { ReminderSchedule, ReminderInstance, FHIRTiming } from '../../types/fhir';
import { reminderScheduleConverter } from './converters';
import { getCurrentUserId } from '../auth/authService';
import { getMedicationRequest } from './medicationRequestService';

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

export async function createReminderSchedule(
  data: CreateReminderScheduleData
): Promise<ReminderSchedule> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to create reminder schedule');
  }

  const medRequest = await getMedicationRequest(data.medicationRequestId);
  if (!medRequest) {
    throw new Error('MedicationRequest not found');
  }

  if (medRequest.userId !== userId) {
    throw new Error('User does not have permission to create schedule for this medication');
  }

  if (medRequest.isPRN) {
    throw new Error('Cannot create schedule for PRN medications');
  }

  const existingSchedule = await getReminderScheduleByMedicationRequest(data.medicationRequestId);
  if (existingSchedule) {
    throw new Error('ReminderSchedule already exists for this MedicationRequest');
  }

  const scheduleRef = firestore().collection(REMINDER_SCHEDULES_COLLECTION).doc();

  const timing = medRequest.dosageInstruction?.[0]?.timing;
  if (!timing) {
    throw new Error('MedicationRequest must have dosageInstruction with timing');
  }

  const startDate = data.startDate || new Date();
  const instances = computeReminderInstances(timing, startDate, PRECOMPUTE_DAYS);

  const medicationName =
    medRequest.medicationCodeableConcept?.text ||
    medRequest.medicationCodeableConcept?.coding?.[0]?.display ||
    'Unknown medication';

  const validUntilDate = addDays(startDate, PRECOMPUTE_DAYS);
  const validUntil = validUntilDate.toISOString().split('T')[0];

  const schedule: ReminderSchedule = {
    id: scheduleRef.id,
    userId,
    patientId: medRequest.patientId,
    medicationRequestId: data.medicationRequestId,
    medicationName,
    timing,
    isPRN: false,
    isEnabled: true,
    instances,
    generatedAt: firestore.Timestamp.now() as any,
    validUntil,
  };

  const firestoreData = reminderScheduleConverter.toFirestore(schedule);
  await scheduleRef.set(firestoreData);

  const snapshot = await scheduleRef.get();
  return reminderScheduleConverter.fromFirestore(snapshot);
}

export async function getReminderSchedule(
  scheduleId: string
): Promise<ReminderSchedule | null> {
  const snapshot = await firestore().collection(REMINDER_SCHEDULES_COLLECTION).doc(scheduleId).get();

  if (!snapshot.exists) {
    return null;
  }

  return reminderScheduleConverter.fromFirestore(snapshot);
}

export async function getReminderScheduleByMedicationRequest(
  medicationRequestId: string
): Promise<ReminderSchedule | null> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get reminder schedule');
  }

  const snapshot = await firestore()
    .collection(REMINDER_SCHEDULES_COLLECTION)
    .where('userId', '==', userId)
    .where('medicationRequestId', '==', medicationRequestId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return reminderScheduleConverter.fromFirestore(snapshot.docs[0]);
}

export async function getPatientReminderSchedules(
  patientId: string
): Promise<ReminderSchedule[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get reminder schedules');
  }

  const snapshot = await firestore()
    .collection(REMINDER_SCHEDULES_COLLECTION)
    .where('userId', '==', userId)
    .where('patientId', '==', patientId)
    .where('isEnabled', '==', true)
    .get();

  return snapshot.docs.map((doc) => reminderScheduleConverter.fromFirestore(doc));
}

export async function getUpcomingReminders(
  patientId: string,
  hoursAhead = 24
): Promise<ReminderInstance[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to get upcoming reminders');
  }

  const schedules = await getPatientReminderSchedules(patientId);
  const now = new Date();
  const endTime = addHours(now, hoursAhead);

  const upcomingInstances: ReminderInstance[] = [];

  for (const schedule of schedules) {
    for (const instance of schedule.instances) {
      const scheduledTime = instance.effectiveDateTime.toDate();
      if (scheduledTime >= now && scheduledTime <= endTime && instance.status === 'pending') {
        upcomingInstances.push(instance);
      }
    }
  }

  upcomingInstances.sort(
    (a, b) => a.effectiveDateTime.toMillis() - b.effectiveDateTime.toMillis()
  );

  return upcomingInstances;
}

export async function markNotificationSent(
  scheduleId: string,
  instanceId: string,
  notificationId: string
): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to mark notification sent');
  }

  const schedule = await getReminderSchedule(scheduleId);
  if (!schedule) {
    throw new Error('ReminderSchedule not found');
  }

  if (schedule.userId !== userId) {
    throw new Error('User does not have permission to update this schedule');
  }

  const updatedInstances = schedule.instances.map((instance: ReminderInstance) => {
    if (instance.id === instanceId) {
      return {
        ...instance,
        status: 'sent' as const,
        sentAt: firestore.Timestamp.now() as any,
        notificationId,
      };
    }
    return instance;
  });

  await firestore()
    .collection(REMINDER_SCHEDULES_COLLECTION)
    .doc(scheduleId)
    .update({ instances: updatedInstances });
}

export async function markReminderCompleted(
  scheduleId: string,
  instanceId: string,
  administrationId: string
): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to mark reminder completed');
  }

  const schedule = await getReminderSchedule(scheduleId);
  if (!schedule) {
    throw new Error('ReminderSchedule not found');
  }

  if (schedule.userId !== userId) {
    throw new Error('User does not have permission to update this schedule');
  }

  const updatedInstances = schedule.instances.map((instance: ReminderInstance) => {
    if (instance.id === instanceId) {
      return {
        ...instance,
        status: 'completed' as const,
        loggedAt: firestore.Timestamp.now() as any,
        medicationAdministrationId: administrationId,
      };
    }
    return instance;
  });

  await firestore()
    .collection(REMINDER_SCHEDULES_COLLECTION)
    .doc(scheduleId)
    .update({ instances: updatedInstances });
}

export async function markReminderMissed(
  scheduleId: string,
  instanceId: string
): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to mark reminder missed');
  }

  const schedule = await getReminderSchedule(scheduleId);
  if (!schedule) {
    throw new Error('ReminderSchedule not found');
  }

  if (schedule.userId !== userId) {
    throw new Error('User does not have permission to update this schedule');
  }

  const updatedInstances = schedule.instances.map((instance: ReminderInstance) => {
    if (instance.id === instanceId) {
      return {
        ...instance,
        status: 'missed' as const,
      };
    }
    return instance;
  });

  await firestore()
    .collection(REMINDER_SCHEDULES_COLLECTION)
    .doc(scheduleId)
    .update({ instances: updatedInstances });
}

export async function updateReminderSchedule(
  scheduleId: string,
  updates: UpdateReminderScheduleData
): Promise<ReminderSchedule> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to update reminder schedule');
  }

  const scheduleRef = firestore().collection(REMINDER_SCHEDULES_COLLECTION).doc(scheduleId);
  const snapshot = await scheduleRef.get();

  if (!snapshot.exists) {
    throw new Error('ReminderSchedule not found');
  }

  const existingSchedule = reminderScheduleConverter.fromFirestore(snapshot);

  if (existingSchedule.userId !== userId) {
    throw new Error('User does not have permission to update this schedule');
  }

  await scheduleRef.update(updates);

  const updatedSnapshot = await scheduleRef.get();
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

  const validUntilDate = new Date(schedule.validUntil);
  const daysRemaining = Math.floor(
    (validUntilDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysRemaining > REFRESH_THRESHOLD_DAYS) {
    return schedule;
  }

  const medRequest = await getMedicationRequest(schedule.medicationRequestId);
  if (!medRequest) {
    throw new Error('MedicationRequest not found');
  }

  const lastInstance = schedule.instances.reduce(
    (latest: ReminderInstance, instance: ReminderInstance) => {
      return instance.effectiveDateTime.toMillis() > latest.effectiveDateTime.toMillis()
        ? instance
        : latest;
    }
  );

  const startDate = addDays(lastInstance.effectiveDateTime.toDate(), 1);
  const newInstances = computeReminderInstances(schedule.timing, startDate, PRECOMPUTE_DAYS);
  const updatedInstances = [...schedule.instances, ...newInstances];

  const newValidUntilDate = addDays(startDate, PRECOMPUTE_DAYS);
  const newValidUntil = newValidUntilDate.toISOString().split('T')[0];

  await firestore()
    .collection(REMINDER_SCHEDULES_COLLECTION)
    .doc(scheduleId)
    .update({
      instances: updatedInstances,
      generatedAt: firestore.Timestamp.now(),
      validUntil: newValidUntil,
    });

  const updatedSnapshot = await firestore()
    .collection(REMINDER_SCHEDULES_COLLECTION)
    .doc(scheduleId)
    .get();
  return reminderScheduleConverter.fromFirestore(updatedSnapshot);
}

export async function deleteReminderSchedule(scheduleId: string): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to delete reminder schedule');
  }

  const schedule = await getReminderSchedule(scheduleId);
  if (!schedule) {
    throw new Error('ReminderSchedule not found');
  }

  if (schedule.userId !== userId) {
    throw new Error('User does not have permission to delete this schedule');
  }

  await firestore().collection(REMINDER_SCHEDULES_COLLECTION).doc(scheduleId).delete();
}

function computeReminderInstances(
  timing: FHIRTiming,
  startDate: Date,
  days: number
): ReminderInstance[] {
  if (!timing?.repeat) {
    return [];
  }

  const instances: ReminderInstance[] = [];
  const repeat = timing.repeat;

  const frequency = repeat.frequency || 1;
  const period = repeat.period || 1;
  const periodUnit = (repeat.periodUnit || 'd') as string;
  const timesOfDay: string[] = repeat.timeOfDay || [];
  const daysOfWeek: string[] = repeat.dayOfWeek || [];

  let periodHours: number;
  switch (periodUnit) {
    case 's':
      periodHours = period / 3600;
      break;
    case 'min':
      periodHours = period / 60;
      break;
    case 'h':
      periodHours = period;
      break;
    case 'd':
      periodHours = period * 24;
      break;
    case 'wk':
      periodHours = period * 24 * 7;
      break;
    case 'mo':
      periodHours = period * 24 * 30;
      break;
    case 'a':
      periodHours = period * 24 * 365;
      break;
    default:
      periodHours = 24;
  }

  const endDate = addDays(startDate, days);
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (daysOfWeek.length > 0) {
      const dayOfWeek = currentDate
        .toLocaleDateString('en-US', {
          weekday: 'short',
        })
        .toLowerCase();
      if (!daysOfWeek.includes(dayOfWeek)) {
        currentDate = addDays(currentDate, 1);
        continue;
      }
    }

    if (timesOfDay.length > 0) {
      for (const timeOfDay of timesOfDay) {
        const [hours, minutes, seconds = 0] = timeOfDay.split(':').map(Number);
        const effectiveDateTime = new Date(currentDate);
        effectiveDateTime.setHours(hours, minutes, seconds, 0);

        if (effectiveDateTime >= startDate && effectiveDateTime <= endDate) {
          const instanceDate = effectiveDateTime.toISOString().split('T')[0];
          instances.push({
            id: `${effectiveDateTime.getTime()}`,
            instanceDate,
            timeOfDay,
            effectiveDateTime: firestore.Timestamp.fromDate(effectiveDateTime) as any,
            status: 'pending',
          });
        }
      }
    } else {
      for (let i = 0; i < frequency; i++) {
        const effectiveDateTime = new Date(currentDate);
        effectiveDateTime.setHours(
          effectiveDateTime.getHours() + (i * periodHours) / frequency
        );

        if (effectiveDateTime >= startDate && effectiveDateTime <= endDate) {
          const instanceDate = effectiveDateTime.toISOString().split('T')[0];
          const timeOfDay = effectiveDateTime.toTimeString().split(' ')[0];
          instances.push({
            id: `${effectiveDateTime.getTime()}`,
            instanceDate,
            timeOfDay,
            effectiveDateTime: firestore.Timestamp.fromDate(effectiveDateTime) as any,
            status: 'pending',
          });
        }
      }
    }

    currentDate = addHours(currentDate, periodHours);
  }

  return instances;
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
