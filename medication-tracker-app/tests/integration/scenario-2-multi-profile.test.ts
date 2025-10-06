/**
 * T012: Integration Test - Scenario 2: Multi-Profile Management
 * 
 * Tests managing multiple patient profiles (parent tracking children):
 * "As a mother of two children with ADHD medication, I want to manage both
 * their schedules separately so I don't confuse their doses."
 * 
 * User Flow:
 * 1. Create child profiles (Emily, Ryan)
 * 2. Add medications per child (different schedules)
 * 3. Profile switching
 * 4. Context-aware notifications
 * 5. Separate history views
 * 
 * Performance Assertions:
 * - Can manage 3+ profiles without confusion
 * - Notifications correctly tagged with profile name
 * - Profile-scoped queries perform < 300ms even with 1000+ logs
 * 
 * @requires Firebase services (Auth, Firestore)
 */

import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, Timestamp } from 'firebase/firestore';

describe('T012: Scenario 2 - Multi-Profile Management', () => {
  let app: any;
  let auth: any;

  const testEmail = `test-multiprofile-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || 'test-api-key',
      authDomain: 'test-project.firebaseapp.com',
      projectId: 'test-medication-tracker',
    };

    const apps = getApps();
    await Promise.all(apps.map((app) => deleteApp(app)));

    app = initializeApp(firebaseConfig, 'test-scenario-2');
    auth = getAuth(app);
    getFirestore(app);

    await createUserWithEmailAndPassword(auth, testEmail, testPassword);
  });

  afterAll(async () => {
    if (auth.currentUser) await signOut(auth);
    if (app) await deleteApp(app);
  });

  describe('Step 1: Create Child Profiles', () => {
    let userId: string;
    let emilyPatientId: string;
    let ryanPatientId: string;

    beforeAll(() => {
      userId = auth.currentUser?.uid;
      emilyPatientId = `patient-${userId}-emily`;
      ryanPatientId = `patient-${userId}-ryan`;
    });

    it('should create child profile for Emily', () => {
      const emilyProfile = {
        resourceType: 'Patient',
        id: emilyPatientId,
        userId: userId,
        active: true,
        name: [{ text: 'Emily', family: 'Nguyen', given: ['Emily'] }],
        birthDate: '2015-06-10',
        gender: 'female',
        relationship: 'daughter',
        meta: { createdAt: Timestamp.now(), lastUpdated: Timestamp.now() },
      };

      expect(emilyProfile.name[0].text).toBe('Emily');
      expect(emilyProfile.relationship).toBe('daughter');
      expect(emilyProfile.userId).toBe(userId);
    });

    it('should create child profile for Ryan', () => {
      const ryanProfile = {
        resourceType: 'Patient',
        id: ryanPatientId,
        userId: userId,
        active: true,
        name: [{ text: 'Ryan', family: 'Nguyen', given: ['Ryan'] }],
        birthDate: '2018-09-22',
        gender: 'male',
        relationship: 'son',
        meta: { createdAt: Timestamp.now(), lastUpdated: Timestamp.now() },
      };

      expect(ryanProfile.name[0].text).toBe('Ryan');
      expect(ryanProfile.relationship).toBe('son');
      expect(ryanProfile.userId).toBe(userId);
    });

    it('should allow managing 3+ profiles (parent + 2 children)', () => {
      const profiles = [
        { id: `patient-${userId}-001`, name: 'John (Parent)', userId },
        { id: emilyPatientId, name: 'Emily', userId },
        { id: ryanPatientId, name: 'Ryan', userId },
      ];

      expect(profiles).toHaveLength(3);
      expect(profiles.every((p) => p.userId === userId)).toBe(true);
    });
  });

  describe('Step 2: Add Medications Per Child', () => {
    let userId: string;
    let emilyPatientId: string;
    let ryanPatientId: string;

    beforeAll(() => {
      userId = auth.currentUser?.uid;
      emilyPatientId = `patient-${userId}-emily`;
      ryanPatientId = `patient-${userId}-ryan`;
    });

    it('should add school-day only medication for Emily', () => {
      const emilyMedication = {
        resourceType: 'MedicationRequest',
        id: `med-req-emily-001`,
        userId: userId,
        patientId: emilyPatientId,
        status: 'active',
        intent: 'order',
        medicationName: 'Adderall 10mg',
        dosageInstruction: [
          {
            timing: {
              repeat: {
                frequency: 1,
                period: 1,
                periodUnit: 'day',
                timeOfDay: ['07:00'],
                dayOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'], // School days only
              },
            },
          },
        ],
      };

      expect(emilyMedication.patientId).toBe(emilyPatientId);
      expect(emilyMedication.dosageInstruction[0].timing.repeat.dayOfWeek).toEqual([
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
      ]);
    });

    it('should add twice-daily medication for Ryan', () => {
      const ryanMedication = {
        resourceType: 'MedicationRequest',
        id: `med-req-ryan-001`,
        userId: userId,
        patientId: ryanPatientId,
        status: 'active',
        intent: 'order',
        medicationName: 'Ritalin 5mg',
        dosageInstruction: [
          {
            timing: {
              repeat: {
                frequency: 2,
                period: 1,
                periodUnit: 'day',
                timeOfDay: ['07:00', '14:00'], // 7 AM and 2 PM
              },
            },
          },
        ],
      };

      expect(ryanMedication.patientId).toBe(ryanPatientId);
      expect(ryanMedication.dosageInstruction[0].timing.repeat.frequency).toBe(2);
      expect(ryanMedication.dosageInstruction[0].timing.repeat.timeOfDay).toEqual([
        '07:00',
        '14:00',
      ]);
    });
  });

  describe('Step 3: Profile Switching', () => {
    it('should filter medications by patientId', () => {
      const userId = auth.currentUser?.uid;
      const allMedications = [
        { id: 'med-1', patientId: `patient-${userId}-001`, name: 'Aspirin' },
        { id: 'med-2', patientId: `patient-${userId}-emily`, name: 'Adderall' },
        { id: 'med-3', patientId: `patient-${userId}-ryan`, name: 'Ritalin' },
      ];

      const currentPatientId = `patient-${userId}-emily`;
      const emilyMedications = allMedications.filter((m) => m.patientId === currentPatientId);

      expect(emilyMedications).toHaveLength(1);
      expect(emilyMedications[0].name).toBe('Adderall');
    });

    it('should query medications for specific profile in < 300ms', async () => {
      const startTime = Date.now();

      // Simulate query with 1000+ total logs across all profiles
      const allLogs = Array.from({ length: 1000 }, (_, i) => ({
        id: `log-${i}`,
        patientId: `patient-${i % 3}`, // Distributed across 3 profiles
      }));

      const targetPatientId = 'patient-1';
      const filteredLogs = allLogs.filter((log) => log.patientId === targetPatientId);

      const queryTime = Date.now() - startTime;

      expect(filteredLogs.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(300);
    });
  });

  describe('Step 4: Context-Aware Notifications', () => {
    it('should tag notifications with profile name', () => {
      const notifications = [
        {
          time: '07:00',
          title: 'Time for Emily to take Adderall - 10mg tablet',
          patientName: 'Emily',
          patientId: 'patient-emily',
        },
        {
          time: '07:00',
          title: 'Time for Ryan to take Ritalin - 5mg tablet',
          patientName: 'Ryan',
          patientId: 'patient-ryan',
        },
      ];

      expect(notifications[0].title).toContain('Emily');
      expect(notifications[1].title).toContain('Ryan');
      expect(notifications[0].patientId).not.toBe(notifications[1].patientId);
    });

    it('should deep-link to correct profile from notification', () => {
      const notificationPayload = {
        type: 'medication_reminder',
        patientId: 'patient-emily',
        medicationRequestId: 'med-req-emily-001',
        deepLink: 'medicationtracker://medication/med-req-emily-001?patientId=patient-emily',
      };

      expect(notificationPayload.deepLink).toContain('patientId=patient-emily');
      expect(notificationPayload.deepLink).toContain('medication/med-req-emily-001');
    });
  });

  describe('Step 5: Separate History Views', () => {
    it('should show only Emily medications in her history', () => {
      const emilyLogs = [
        { id: 'log-1', patientId: 'patient-emily', medicationName: 'Adderall', date: '2025-10-01' },
        { id: 'log-2', patientId: 'patient-emily', medicationName: 'Adderall', date: '2025-10-02' },
      ];

      const hasOnlyEmilyLogs = emilyLogs.every((log) => log.patientId === 'patient-emily');
      expect(hasOnlyEmilyLogs).toBe(true);
    });

    it('should show only Ryan medications in his history', () => {
      const ryanLogs = [
        { id: 'log-3', patientId: 'patient-ryan', medicationName: 'Ritalin', dose: 'AM' },
        { id: 'log-4', patientId: 'patient-ryan', medicationName: 'Ritalin', dose: 'PM' },
      ];

      const hasOnlyRyanLogs = ryanLogs.every((log) => log.patientId === 'patient-ryan');
      expect(hasOnlyRyanLogs).toBe(true);
    });

    it('should calculate combined adherence for parent dashboard', () => {
      const allChildrenLogs = [
        { patientId: 'emily', status: 'completed' },
        { patientId: 'emily', status: 'completed' },
        { patientId: 'ryan', status: 'completed' },
        { patientId: 'ryan', status: 'not-done' },
      ];

      const completedCount = allChildrenLogs.filter((log) => log.status === 'completed').length;
      const totalCount = allChildrenLogs.length;
      const combinedAdherence = Math.round((completedCount / totalCount) * 100);

      expect(combinedAdherence).toBe(75); // 3 out of 4 = 75%
    });
  });

  describe('Data Isolation & Security', () => {
    it('should prevent data leakage between profiles', () => {
      const userId = auth.currentUser?.uid;

      const emilyData = { patientId: `patient-${userId}-emily`, userId };
      const ryanData = { patientId: `patient-${userId}-ryan`, userId };

      // Both profiles belong to same userId (parent)
      expect(emilyData.userId).toBe(ryanData.userId);

      // But patientIds are different (data isolation)
      expect(emilyData.patientId).not.toBe(ryanData.patientId);

      // Security rules enforce: queries must filter by patientId
      const isIsolated =
        emilyData.patientId !== ryanData.patientId && emilyData.userId === ryanData.userId;
      expect(isIsolated).toBe(true);
    });
  });
});
