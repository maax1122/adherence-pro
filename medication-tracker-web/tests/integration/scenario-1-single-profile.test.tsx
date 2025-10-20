import { describe, it, beforeEach, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  PatientDocument,
  MedicationRequestDocument,
} from '@/types/fhir';
import {
  resetTestState,
  seedPatients,
  seedMedications,
  renderAppAt,
  createUserWithEmailAndPassword,
  updateProfile,
  getUserPatientsMock,
  getPatientMedicationRequestsMock,
  getPatientMedicationLogsMock,
  logMedicationMock,
} from './utils/appTestUtils';

const seedScenarioData = () => {
  const patient: PatientDocument = {
    resourceType: 'Patient',
    id: 'patient-001',
    userId: 'user-123',
    active: true,
    name: [
      {
        text: 'John Doe',
        given: ['John'],
        family: 'Doe',
      },
    ],
    relationship: 'self',
  };

  const medication: MedicationRequestDocument = {
    resourceType: 'MedicationRequest',
    id: 'med-001',
    userId: 'user-123',
    patientId: patient.id,
    status: 'active',
    intent: 'order',
    medicationName: 'Aspirin 100mg',
    dosageInstruction: [
      {
        text: 'Take one 100mg tablet at 8:00 AM',
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
  };

  seedPatients([patient]);
  seedMedications([medication]);
};

describe('W024: Scenario 1 - Single Profile Setup (Web)', () => {
  beforeEach(() => {
    resetTestState();
  });

  it('registers a user, loads dashboard data, and logs a medication dose', async () => {
    const user = userEvent.setup();
    seedScenarioData();

    renderAppAt('/register');

    await user.type(screen.getByLabelText(/Full Name/i), 'John Doe');
    await user.type(screen.getByLabelText(/Email Address/i), 'john@example.com');
    await user.type(
      screen.getByLabelText(/Password/i, { selector: 'input[name="password"]' }),
      'SecurePass123!'
    );
    await user.type(screen.getByLabelText(/Confirm Password/i), 'SecurePass123!');

    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledOnce();
      expect(updateProfile).toHaveBeenCalledOnce();
    });

    await screen.findByRole('heading', { name: /Dashboard/i });
    expect(getUserPatientsMock).toHaveBeenCalled();

    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    expect(screen.getByText(/Upcoming medications today/i)).toBeInTheDocument();

    const navigation = screen.getByRole('navigation', { hidden: true });
    const medicationsNav = within(navigation).getAllByText('Medications')[0];
    await user.click(medicationsNav);

    await screen.findByText('Aspirin 100mg');
    expect(getPatientMedicationRequestsMock).toHaveBeenCalled();

    const logDoseButton = screen.getByRole('button', { name: /Log dose/i });
    await user.click(logDoseButton);

    await waitFor(() => {
      expect(logMedicationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          medicationRequestId: 'med-001',
          status: 'completed',
        })
      );
    });

    const dashboardNav = within(navigation).getAllByText('Dashboard')[0];
    await user.click(dashboardNav);

    await screen.findByText(/Recent medication logs/i);
    expect(getPatientMedicationLogsMock).toHaveBeenCalled();

    let logsContainer: HTMLElement | null = screen.getByText(/Recent medication logs/i).parentElement;
    let logsList: HTMLUListElement | null = null;
    while (logsContainer && !logsList) {
      logsList = logsContainer.querySelector('ul');
      logsContainer = logsContainer.parentElement;
    }

    expect(logsList).not.toBeNull();
    expect(within(logsList as HTMLElement).getByText('Aspirin 100mg')).toBeInTheDocument();
    expect(
      within(logsList as HTMLElement).getByText(/Dose logged via integration test/i)
    ).toBeInTheDocument();
  });
});
