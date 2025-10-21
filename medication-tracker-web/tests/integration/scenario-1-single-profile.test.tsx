import { describe, it, beforeEach, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  resetTestState,
  renderAppAt,
  createUserWithEmailAndPassword,
  updateProfile,
  getUserPatientsMock,
  createPatientMock,
  createMedicationRequestMock,
  getPatientMedicationRequestsMock,
  getPatientMedicationLogsMock,
  logMedicationMock,
} from './utils/appTestUtils';

describe('W024: Scenario 1 - Single Profile Setup (Web)', () => {
  beforeEach(() => {
    resetTestState();
  });

  it('registers, creates a profile, adds a medication, and logs a dose', async () => {
    const user = userEvent.setup();

    renderAppAt('/register');

    // Step 1: Registration
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

    // Step 2: Create Patient Profile via dialog
    await screen.findByRole('heading', { name: /Dashboard/i });
    expect(getUserPatientsMock).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Add Profile/i }));
    const profileDialog = await screen.findByRole('dialog', { name: /New profile/i });

    await user.clear(within(profileDialog).getByLabelText(/Full Name/i));
    await user.type(within(profileDialog).getByLabelText(/Full Name/i), 'John Doe');
    await user.click(within(profileDialog).getByLabelText(/Date of Birth/i));
    await user.type(within(profileDialog).getByLabelText(/Date of Birth/i), '1990-01-01');
    await user.click(within(profileDialog).getByRole('button', { name: /Save Profile/i }));

    await waitFor(() =>
      expect(createPatientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          birthDate: '1990-01-01',
          relationship: 'self',
        })
      )
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /New profile/i })).not.toBeInTheDocument()
    );

    await screen.findAllByText('John Doe');
    expect(getUserPatientsMock.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Step 3: Add Scheduled Medication
    const addMedicationButtons = screen.getAllByRole('button', { name: /Add Medication/i });
    await user.click(addMedicationButtons[0]);
    const medicationDialog = await screen.findByRole('dialog', { name: /Add medication/i });

    await user.clear(within(medicationDialog).getByLabelText(/Medication name/i));
    await user.type(
      within(medicationDialog).getByLabelText(/Medication name/i),
      'Aspirin 100mg'
    );

    await user.clear(within(medicationDialog).getByLabelText(/Dosage amount/i));
    await user.type(within(medicationDialog).getByLabelText(/Dosage amount/i), '100');

    const timeInput = within(medicationDialog).getByLabelText(/Time of day/i);
    await user.clear(timeInput);
    await user.type(timeInput, '20:00');
    await user.click(within(medicationDialog).getByRole('button', { name: /Add time/i }));

    await user.type(
      within(medicationDialog).getByLabelText(/Instructions for patient/i),
      'Take with food'
    );

    await user.click(within(medicationDialog).getByRole('button', { name: /Save medication/i }));

    await waitFor(() =>
      expect(createMedicationRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: expect.any(String),
          medicationName: 'Aspirin 100mg',
          isPRN: false,
        })
      )
    );

    await waitFor(() => expect(getPatientMedicationRequestsMock).toHaveBeenCalled());
    const lastPatientId = getPatientMedicationRequestsMock.mock.calls.at(-1)?.[0];
    expect(lastPatientId).toMatch(/^patient-/);

    // Verify dashboard overview reflects new medication
    const upcomingTitle = await screen.findByText(/Upcoming medications today/i);
    expect(upcomingTitle).toBeInTheDocument();
    expect(screen.getByText(/1 dose remaining/i)).toBeInTheDocument();
    expect(screen.getByText('Aspirin 100mg')).toBeInTheDocument();

    // Step 4: Navigate to Medications list and log a dose
    const navigation = screen.getByRole('navigation', { hidden: true });
    const medicationsNav = within(navigation).getAllByText('Medications')[0];
    await user.click(medicationsNav);

    await screen.findByRole('heading', { name: /Medications/i });
    expect(await screen.findByText('Aspirin 100mg')).toBeInTheDocument();
    expect(screen.getByText(/Take with food/i)).toBeInTheDocument();

    const logDoseButton = screen.getByRole('button', { name: /Log dose/i });
    await user.click(logDoseButton);

    await waitFor(() =>
      expect(logMedicationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          medicationRequestId: expect.any(String),
          status: 'completed',
        })
      )
    );

    // Step 5: Return to dashboard to confirm recent log
    const dashboardNav = within(navigation).getAllByText('Dashboard')[0];
    await user.click(dashboardNav);

    await screen.findByText(/Recent medication logs/i);
    await waitFor(() => expect(getPatientMedicationLogsMock).toHaveBeenCalled());

    const noteMatches = await screen.findAllByText(/Dose logged via integration test/i);
    expect(noteMatches.length).toBeGreaterThan(0);
  });
});
