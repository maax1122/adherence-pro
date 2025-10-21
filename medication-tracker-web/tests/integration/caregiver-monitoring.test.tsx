import { describe, it, beforeEach, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PatientDocument, MedicationRequestDocument } from '@/types/fhir';
import {
  resetTestState,
  seedPatients,
  seedMedications,
  renderAppAt,
  setAuthUser,
  setPatientLookup,
  logMedicationMock,
  createInvitationMock,
  acceptInvitationMock,
  notifyCaregiverInvitationSentMock,
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

describe('T027: Caregiver monitoring end-to-end integration', () => {
  beforeEach(() => {
    resetTestState();
    seedPatients([scenarioPatient]);
    seedMedications([scenarioMedication]);
    setPatientLookup((id) => (id === scenarioPatient.id ? scenarioPatient : null));
  });

  it('covers invitation, acceptance, dashboard insights, and logging on behalf', async () => {
    const user = userEvent.setup();

    // Patient sends caregiver invitation
    setAuthUser(patientUser);
    renderAppAt('/family');

    await screen.findByRole('heading', { name: /Caregiver access/i });

    await user.click(screen.getByRole('button', { name: /Invite caregiver/i }));

    const inviteDialog = await screen.findByRole('dialog', { name: /Invite caregiver/i });
    await user.clear(within(inviteDialog).getByLabelText(/Caregiver email/i));
    await user.type(within(inviteDialog).getByLabelText(/Caregiver email/i), caregiverUser.email!);

    const logPermissionCheckbox = within(inviteDialog).getByLabelText(
      /Log medications on behalf of patient/i
    );
    if (!(logPermissionCheckbox as HTMLInputElement).checked) {
      await user.click(logPermissionCheckbox);
    }

    await user.click(within(inviteDialog).getByRole('button', { name: /Send invitation/i }));

    await waitFor(() =>
      expect(createInvitationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: scenarioPatient.id,
          caregiverEmail: caregiverUser.email,
          permissions: expect.arrayContaining(['view_only', 'can_log']),
        })
      )
    );
    await waitFor(() => expect(notifyCaregiverInvitationSentMock).toHaveBeenCalled());

    await screen.findByText(caregiverUser.email!);

    // Caregiver reviews dashboard and accepts invitation
    setAuthUser(caregiverUser);
    renderAppAt('/caregiver');

    await screen.findByText(/Caregiver dashboard/i);
    const pendingListItemText = await screen.findByText(caregiverUser.email!);
    const pendingListItem = pendingListItemText.closest('li') as HTMLElement | null;
    expect(pendingListItem).not.toBeNull();

    const acceptButton = pendingListItem?.querySelector(
      'span[aria-label="Accept invitation"] button'
    ) as HTMLButtonElement | null;
    expect(acceptButton).not.toBeNull();
    await user.click(acceptButton!);

    await waitFor(() => expect(acceptInvitationMock).toHaveBeenCalled());

    // Caregiver views medications and logs on behalf
    renderAppAt('/medications');

    await screen.findByText('Aspirin 100mg');

    const logDoseButton = screen.getByRole('button', { name: /Log dose/i });
    await user.click(logDoseButton);

    await waitFor(() =>
      expect(logMedicationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          medicationRequestId: scenarioMedication.id,
          status: 'completed',
        })
      )
    );

    // Patient sees caregiver listed as active
    setAuthUser(patientUser);
    renderAppAt('/family');

    await screen.findByText(/Active caregivers/i);
    await screen.findByText(caregiverUser.email!);
    expect(screen.getByLabelText(/Log medications/i)).toBeChecked();
  });
});
