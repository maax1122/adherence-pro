import { describe, it, beforeEach, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PatientDocument, MedicationRequestDocument } from '@/types/fhir';
import {
  resetTestState,
  seedPatients,
  seedMedications,
  renderAppAt,
  notifyAuthListeners,
  getUserPatientsMock,
  getPatientMedicationRequestsMock,
} from './utils/appTestUtils';

const parentUser = {
  uid: 'user-123',
  email: 'parent@example.com',
  displayName: 'John Doe',
  providerId: 'password',
};

const seedScenarioData = () => {
  const patients: PatientDocument[] = [
    {
      resourceType: 'Patient',
      id: 'patient-001',
      userId: parentUser.uid,
      active: true,
      name: [{ text: 'John Doe', given: ['John'], family: 'Doe' }],
      relationship: 'self',
    },
    {
      resourceType: 'Patient',
      id: 'patient-002',
      userId: parentUser.uid,
      active: true,
      name: [{ text: 'Emma Doe', given: ['Emma'], family: 'Doe' }],
      relationship: 'family_member',
    },
    {
      resourceType: 'Patient',
      id: 'patient-003',
      userId: parentUser.uid,
      active: true,
      name: [{ text: 'Oliver Doe', given: ['Oliver'], family: 'Doe' }],
      relationship: 'family_member',
    },
  ];

  const medications: MedicationRequestDocument[] = [
    {
      resourceType: 'MedicationRequest',
      id: 'med-001',
      userId: parentUser.uid,
      patientId: 'patient-001',
      status: 'active',
      intent: 'order',
      medicationName: 'Aspirin 100mg',
      dosageInstruction: [
        {
          text: 'Take one tablet at 8:00 AM',
          timing: {
            repeat: {
              frequency: 1,
              period: 1,
              periodUnit: 'd',
              timeOfDay: ['08:00'],
            },
          },
        },
      ],
      isPRN: false,
      priority: 'routine',
      medicationCodeableConcept: { text: 'Aspirin 100mg' },
    },
    {
      resourceType: 'MedicationRequest',
      id: 'med-002',
      userId: parentUser.uid,
      patientId: 'patient-002',
      status: 'active',
      intent: 'order',
      medicationName: 'Amoxicillin 250mg',
      dosageInstruction: [
        {
          text: '250mg three times daily',
          timing: {
            repeat: {
              frequency: 3,
              period: 1,
              periodUnit: 'd',
              timeOfDay: ['08:00', '14:00', '20:00'],
            },
          },
        },
      ],
      isPRN: false,
      medicationCodeableConcept: { text: 'Amoxicillin 250mg' },
    },
    {
      resourceType: 'MedicationRequest',
      id: 'med-003',
      userId: parentUser.uid,
      patientId: 'patient-003',
      status: 'active',
      intent: 'order',
      medicationName: 'Vitamin D 400 IU',
      dosageInstruction: [
        {
          text: 'Once daily at 9:00 AM',
          timing: {
            repeat: {
              frequency: 1,
              period: 1,
              periodUnit: 'd',
              timeOfDay: ['09:00'],
            },
          },
        },
      ],
      isPRN: false,
      medicationCodeableConcept: { text: 'Vitamin D 400 IU' },
    },
  ];

  seedPatients(patients);
  seedMedications(medications);
  notifyAuthListeners(parentUser);
};

describe('W025: Scenario 2 - Multi-Profile Family Management (Web)', () => {
  beforeEach(() => {
    resetTestState();
  });

  it('switches between multiple profiles and shows relevant medications', async () => {
    const user = userEvent.setup();
    seedScenarioData();

    renderAppAt('/medications');

    await screen.findByRole('heading', { name: /Medications/i });
    expect(getUserPatientsMock).toHaveBeenCalled();

    // Default selection should show John's medication
    expect(await screen.findByText('Aspirin 100mg')).toBeInTheDocument();
    expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
    expect(screen.queryByText('Vitamin D 400 IU')).not.toBeInTheDocument();

    // Switch to Emma
    await user.click(screen.getByRole('combobox', { name: /Profile/i }));
    {
      const listbox = await screen.findByRole('listbox');
      await user.click(within(listbox).getByText('Emma Doe'));
    }

    await screen.findByText('Amoxicillin 250mg');
    expect(screen.queryByText('Aspirin 100mg')).not.toBeInTheDocument();
    expect(screen.queryByText('Vitamin D 400 IU')).not.toBeInTheDocument();

    // Switch to Oliver
    await user.click(screen.getByRole('combobox', { name: /Profile/i }));
    {
      const listbox = await screen.findByRole('listbox');
      await user.click(within(listbox).getByText('Oliver Doe'));
    }

    await screen.findByText('Vitamin D 400 IU');
    expect(screen.queryByText('Aspirin 100mg')).not.toBeInTheDocument();
    expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();

    // Navigate back to dashboard and verify all profiles visible
    const navigation = screen.getByRole('navigation', { hidden: true });
    const dashboardNav = within(navigation).getAllByText('Dashboard')[0];
    await user.click(dashboardNav);

    await screen.findByRole('heading', { name: /Dashboard/i });
    expect(screen.getAllByText('Emma Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Oliver Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'View' })).toHaveLength(3);

    const requestedPatientIds = getPatientMedicationRequestsMock.mock.calls.map(
      ([patientId]) => patientId
    );
    expect(requestedPatientIds).toEqual(
      expect.arrayContaining(['patient-001', 'patient-002', 'patient-003'])
    );
  });
});
