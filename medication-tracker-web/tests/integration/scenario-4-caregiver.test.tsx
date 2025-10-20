import { describe, it, beforeEach, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  PatientDocument,
  MedicationRequestDocument,
  MedicationAdministrationDocument,
} from '@/types/fhir';
import {
  resetTestState,
  seedPatients,
  seedMedications,
  seedMedicationLogs,
  renderAppAt,
  setAuthUser,
  setPatientLookup,
  logMedicationMock,
} from './utils/appTestUtils';

const patientUser = {
  uid: 'patient-uid',
  email: 'john@example.com',
  displayName: 'John Doe',
  providerId: 'password',
};

const caregiverUser = {
  uid: 'caregiver-uid',
  email: 'caregiver@example.com',
  displayName: 'Jane Smith',
  providerId: 'password',
};

const scenarioPatient: PatientDocument = {
  resourceType: 'Patient',
  id: 'patient-123',
  userId: patientUser.uid,
  active: true,
  name: [{ text: 'John Doe' }],
  relationship: 'self',
};

const scenarioMedication: MedicationRequestDocument = {
  resourceType: 'MedicationRequest',
  id: 'med-aspirin',
  userId: patientUser.uid,
  patientId: scenarioPatient.id,
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
  medicationCodeableConcept: { text: 'Aspirin 100mg' },
};

const seedScenarioData = () => {
  seedPatients([scenarioPatient]);
  seedMedications([scenarioMedication]);
  seedMedicationLogs([]);
  setPatientLookup((id) => (id === scenarioPatient.id ? scenarioPatient : null));
};

describe('W027: Scenario 4 - Caregiver Monitoring (Web)', () => {
  beforeEach(() => {
    resetTestState();
    seedScenarioData();
  });

  it('shows caregiver access to patient medications and allows logging on behalf', async () => {
    const user = userEvent.setup();

    setAuthUser(caregiverUser);
    renderAppAt('/medications');

    await screen.findByRole('heading', { name: /Medications/i });
    expect(await screen.findByText('Aspirin 100mg')).toBeInTheDocument();
    const logButton = screen.getByRole('button', { name: /Log dose/i });

    await user.click(logButton);
    await waitFor(() => {
      expect(logMedicationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          medicationRequestId: 'med-aspirin',
          status: 'completed',
        })
      );
    });
  });
});
