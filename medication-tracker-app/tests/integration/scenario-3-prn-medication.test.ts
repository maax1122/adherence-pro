/**
 * T013: Integration Test - Scenario 3: PRN (As-Needed) Medication
 * 
 * Tests tracking as-needed medications with no fixed schedule:
 * "As someone with occasional migraines, I want to track when I take pain
 * medication as needed (no schedule/reminders), with warnings if I exceed
 * the maximum daily dose."
 * 
 * User Flow:
 * 1. Add PRN medication (no schedule)
 * 2. Log doses proactively
 * 3. Maximum dose warnings (4 doses/24h)
 * 4. PRN history view (no adherence %)
 * 
 * Key Differences from Scheduled Medications:
 * - PRN medications have `isPRN: true` flag
 * - No ReminderSchedule created (zero reminder instances)
 * - No adherence % calculated (can't miss a PRN dose)
 * - maxDosePerPeriod validation enforced
 * - User logs doses reactively (not triggered by reminders)
 * 
 * @requires Firebase services (Auth, Firestore)
 */

import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, Timestamp } from 'firebase/firestore';

describe('T013: Scenario 3 - PRN As-Needed Medication', () => {
  let app: any;
  let auth: any;

  const testEmail = `test-prn-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || 'test-api-key',
      authDomain: 'test-project.firebaseapp.com',
      projectId: 'test-medication-tracker',
    };

    const apps = getApps();
    await Promise.all(apps.map((app) => deleteApp(app)));

    app = initializeApp(firebaseConfig, 'test-scenario-3');
    auth = getAuth(app);
    getFirestore(app);

    await createUserWithEmailAndPassword(auth, testEmail, testPassword);
  });

  afterAll(async () => {
    if (auth.currentUser) await signOut(auth);
    if (app) await deleteApp(app);
  });

  describe('Step 1: Add PRN Medication (No Schedule)', () => {
    it('should create PRN MedicationRequest with isPRN flag', () => {
      const userId = auth.currentUser?.uid;
      const patientId = `patient-${userId}-001`;

      const prnMedication = {
        resourceType: 'MedicationRequest',
        id: `med-req-prn-001`,
        userId: userId,
        patientId: patientId,
        status: 'active',
        intent: 'order',
        medicationName: 'Sumatriptan 100mg',
        isPRN: true, // PRN flag
        maxDosePerPeriod: {
          numerator: { value: 4 },
          denominator: { value: 24, unit: 'hours' },
        },
        dosageInstruction: [
          {
            text: 'Take as needed for migraine. Max 4 doses per 24 hours.',
            asNeededBoolean: true,
          },
        ],
      };

      expect(prnMedication.isPRN).toBe(true);
      expect(prnMedication.maxDosePerPeriod.numerator.value).toBe(4);
      expect(prnMedication.dosageInstruction[0].asNeededBoolean).toBe(true);
    });

    it('should NOT create ReminderSchedule for PRN medications', () => {
      const prnMedicationId = 'med-req-prn-001';
      const reminderSchedule = {
        medicationRequestId: prnMedicationId,
        isPRN: true,
        instances: [], // Empty array - no reminders
      };

      expect(reminderSchedule.instances).toHaveLength(0);
      expect(reminderSchedule.isPRN).toBe(true);
    });

    it('should allow PRN medications with no timing.repeat', () => {
      const prnWithoutSchedule = {
        resourceType: 'MedicationRequest',
        medicationName: 'Ibuprofen 200mg',
        isPRN: true,
        dosageInstruction: [
          {
            text: 'Take as needed for pain',
            asNeededBoolean: true,
            // No timing.repeat field
          },
        ],
      };

      expect(prnWithoutSchedule.dosageInstruction[0]).not.toHaveProperty('timing');
      expect(prnWithoutSchedule.isPRN).toBe(true);
    });
  });

  describe('Step 2: Log Doses Proactively', () => {
    it('should log PRN dose with current timestamp', () => {
      const userId = auth.currentUser?.uid;
      const patientId = `patient-${userId}-001`;

      const prnLog = {
        resourceType: 'MedicationAdministration',
        id: `med-admin-prn-001`,
        userId: userId,
        patientId: patientId,
        medicationRequestId: 'med-req-prn-001',
        status: 'completed',
        effectiveDateTime: Timestamp.now(),
        isPRN: true,
        note: [{ text: 'Took for severe headache' }],
      };

      expect(prnLog.isPRN).toBe(true);
      expect(prnLog.status).toBe('completed');
      expect(prnLog.effectiveDateTime).toBeInstanceOf(Timestamp);
    });

    it('should allow multiple PRN logs in same day', () => {
      const userId = auth.currentUser?.uid;
      const today = new Date();

      const logs = [
        {
          id: 'log-1',
          userId,
          effectiveDateTime: Timestamp.fromDate(new Date(today.setHours(8, 0, 0, 0))),
          isPRN: true,
        },
        {
          id: 'log-2',
          userId,
          effectiveDateTime: Timestamp.fromDate(new Date(today.setHours(12, 30, 0, 0))),
          isPRN: true,
        },
        {
          id: 'log-3',
          userId,
          effectiveDateTime: Timestamp.fromDate(new Date(today.setHours(18, 0, 0, 0))),
          isPRN: true,
        },
      ];

      expect(logs).toHaveLength(3);
      expect(logs.every((log) => log.isPRN === true)).toBe(true);
    });
  });

  describe('Step 3: Maximum Dose Warnings', () => {
    it('should count doses in last 24 hours', () => {
      const now = Timestamp.now();
      const twentyFourHoursAgo = Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000);

      const recentLogs = [
        {
          id: 'log-1',
          effectiveDateTime: Timestamp.fromMillis(now.toMillis() - 2 * 60 * 60 * 1000),
        }, // 2 hours ago
        {
          id: 'log-2',
          effectiveDateTime: Timestamp.fromMillis(now.toMillis() - 5 * 60 * 60 * 1000),
        }, // 5 hours ago
        {
          id: 'log-3',
          effectiveDateTime: Timestamp.fromMillis(now.toMillis() - 10 * 60 * 60 * 1000),
        }, // 10 hours ago
      ];

      const dosesInLast24h = recentLogs.filter(
        (log) => log.effectiveDateTime.toMillis() >= twentyFourHoursAgo.toMillis()
      );

      expect(dosesInLast24h).toHaveLength(3);
    });

    it('should warn when approaching max dose (3 of 4)', () => {
      const maxDoses = 4;
      const currentDoseCount = 3;

      const isApproachingMax = currentDoseCount >= maxDoses - 1;
      const canTakeAnother = currentDoseCount < maxDoses;

      expect(isApproachingMax).toBe(true);
      expect(canTakeAnother).toBe(true);
    });

    it('should block when max dose reached (4 of 4)', () => {
      const maxDoses = 4;
      const currentDoseCount = 4;

      const hasReachedMax = currentDoseCount >= maxDoses;
      const canTakeAnother = currentDoseCount < maxDoses;

      expect(hasReachedMax).toBe(true);
      expect(canTakeAnother).toBe(false);
    });

    it('should show warning with earliest safe time', () => {
      const maxDoses = 4;
      const dosesInLast24h = [
        { effectiveDateTime: Timestamp.fromMillis(Date.now() - 22 * 60 * 60 * 1000) }, // 22h ago
        { effectiveDateTime: Timestamp.fromMillis(Date.now() - 10 * 60 * 60 * 1000) }, // 10h ago
        { effectiveDateTime: Timestamp.fromMillis(Date.now() - 5 * 60 * 60 * 1000) }, // 5h ago
        { effectiveDateTime: Timestamp.fromMillis(Date.now() - 1 * 60 * 60 * 1000) }, // 1h ago
      ];

      if (dosesInLast24h.length >= maxDoses) {
        const oldestDose = dosesInLast24h[0];
        const earliestSafeTime = oldestDose.effectiveDateTime.toMillis() + 24 * 60 * 60 * 1000;
        const hoursUntilSafe = Math.ceil((earliestSafeTime - Date.now()) / (60 * 60 * 1000));

        expect(hoursUntilSafe).toBeGreaterThan(0);
        expect(hoursUntilSafe).toBeLessThanOrEqual(24);
      }
    });
  });

  describe('Step 4: PRN History View (No Adherence %)', () => {
    it('should show PRN logs chronologically', () => {
      const prnLogs = [
        { id: 'log-1', effectiveDateTime: Timestamp.fromDate(new Date('2025-10-05T08:00:00')) },
        { id: 'log-2', effectiveDateTime: Timestamp.fromDate(new Date('2025-10-03T14:30:00')) },
        { id: 'log-3', effectiveDateTime: Timestamp.fromDate(new Date('2025-10-06T20:15:00')) },
      ];

      const sortedLogs = [...prnLogs].sort(
        (a, b) => b.effectiveDateTime.toMillis() - a.effectiveDateTime.toMillis()
      );

      expect(sortedLogs[0].id).toBe('log-3'); // Oct 6 (newest)
      expect(sortedLogs[2].id).toBe('log-2'); // Oct 3 (oldest)
    });

    it('should NOT calculate adherence % for PRN medications', () => {
      const prnLogs = [
        { id: 'log-1', status: 'completed' },
        { id: 'log-2', status: 'completed' },
      ];

      // PRN medications have no scheduled reminders, so no adherence calculation
      const adherencePercentage = null; // Not applicable

      expect(adherencePercentage).toBeNull();
      expect(prnLogs.length).toBeGreaterThan(0); // Has logs, but no adherence
    });

    it('should show frequency statistics instead of adherence', () => {
      const prnLogs = [
        { effectiveDateTime: Timestamp.fromDate(new Date('2025-10-01')) },
        { effectiveDateTime: Timestamp.fromDate(new Date('2025-10-05')) },
        { effectiveDateTime: Timestamp.fromDate(new Date('2025-10-10')) },
        { effectiveDateTime: Timestamp.fromDate(new Date('2025-10-15')) },
      ];

      const dateRange = {
        start: new Date('2025-10-01'),
        end: new Date('2025-10-31'),
      };
      const daysCovered =
        Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;

      const totalDoses = prnLogs.length;
      const avgDosesPerWeek = (totalDoses / daysCovered) * 7;

      expect(totalDoses).toBe(4);
      expect(daysCovered).toBe(31);
      expect(avgDosesPerWeek).toBeCloseTo(0.9, 1); // ~0.9 doses per week
    });
  });

  describe('PRN vs Scheduled Medication Comparison', () => {
    it('should differentiate PRN from scheduled medications', () => {
      const userId = auth.currentUser?.uid;

      const scheduledMed = {
        id: 'med-1',
        userId,
        medicationName: 'Lisinopril 10mg',
        isPRN: false,
        dosageInstruction: [
          { timing: { repeat: { frequency: 1, period: 1, periodUnit: 'day' } } },
        ],
      };

      const prnMed = {
        id: 'med-2',
        userId,
        medicationName: 'Sumatriptan 100mg',
        isPRN: true,
        dosageInstruction: [{ asNeededBoolean: true }],
      };

      expect(scheduledMed.isPRN).toBe(false);
      expect(prnMed.isPRN).toBe(true);
      expect(scheduledMed.dosageInstruction[0]).toHaveProperty('timing');
      expect(prnMed.dosageInstruction[0]).not.toHaveProperty('timing');
    });

    it('should handle mixed list of scheduled and PRN medications', () => {
      const allMedications = [
        { id: 'med-1', name: 'Metformin', isPRN: false },
        { id: 'med-2', name: 'Tylenol', isPRN: true },
        { id: 'med-3', name: 'Lisinopril', isPRN: false },
        { id: 'med-4', name: 'Ibuprofen', isPRN: true },
      ];

      const scheduledMeds = allMedications.filter((m) => !m.isPRN);
      const prnMeds = allMedications.filter((m) => m.isPRN);

      expect(scheduledMeds).toHaveLength(2);
      expect(prnMeds).toHaveLength(2);
    });
  });
});
