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
  logMedicationMock,
} from './utils/appTestUtils';

const caregiverUser = {
  uid: 'user-456',
  email: 'caregiver@example.com',
  displayName: 'Caregiver Carla',
  providerId: 'password',
};

const seedScenarioData = () => {
  const patient: PatientDocument = {
    resourceType: 'Patient',
    id: 'patient-prn-001',
    userId: caregiverUser.uid,
    active: true,
    name: [{ text: 'Alex Smith', given: ['Alex'], family: 'Smith' }],
    relationship: 'family_member',
  };

  const prnMedication: MedicationRequestDocument = {
    resourceType: 'MedicationRequest',
    id: 'med-prn-001',
    userId: caregiverUser.uid,
    patientId: patient.id,
    status: 'active',
    intent: 'order',
    medicationName: 'Tylenol 500mg',
    dosageInstruction: [
      {
        text: 'Take 1-2 tablets as needed for headaches',
        asNeededBoolean: true,
      },
    ],
    isPRN: true,
    priority: 'routine',
    medicationCodeableConcept: { text: 'Tylenol 500mg' },
  };

  seedPatients([patient]);
  seedMedications([prnMedication]);
  notifyAuthListeners(caregiverUser);
};

describe('W026: Scenario 3 - PRN Medication (Web)', () => {
  beforeEach(() => {
    resetTestState();
  });

  it('displays PRN medication details and allows logging intake', async () => {
    const user = userEvent.setup();
    seedScenarioData();

    renderAppAt('/medications');

    await screen.findByRole('heading', { name: /Medications/i });

    // PRN badge should be visible
    await screen.findByText('Tylenol 500mg');
    expect(screen.getAllByText('PRN').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/As needed/i).length).toBeGreaterThan(0);

    // Log intake
    const logButton = screen.getByRole('button', { name: /Log dose/i });
    await user.click(logButton);

    await waitFor(() => {
      expect(logMedicationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          medicationRequestId: 'med-prn-001',
          status: 'completed',
        })
      );
    });
  });
});
