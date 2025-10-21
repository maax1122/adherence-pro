import { describe, it, beforeEach, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PatientDocument, MedicationRequestDocument } from '@/types/fhir';
import {
  resetTestState,
  seedPatients,
  seedMedications,
  renderAppAt,
  signInWithEmailAndPassword,
  getUserPatientsMock,
  createPatientMock,
  createMedicationRequestMock,
  getPatientMedicationRequestsMock,
} from './utils/appTestUtils';

const existingPatient: PatientDocument = {
  resourceType: 'Patient',
  id: 'patient-seed-john',
  userId: 'user-123',
  active: true,
  name: [{ text: 'John Doe', given: ['John'], family: 'Doe' }],
  relationship: 'self',
};

const johnMorningMedication: MedicationRequestDocument = {
  resourceType: 'MedicationRequest',
  id: 'med-seed-aspirin',
  userId: 'user-123',
  patientId: existingPatient.id,
  status: 'active',
  intent: 'order',
  medicationName: 'Aspirin 100mg',
  dosageInstruction: [
    {
      text: 'Take one tablet at 8:00 AM',
      timing: {
        repeat: { frequency: 1, period: 1, periodUnit: 'd', timeOfDay: ['08:00'] },
      },
    },
  ],
  isPRN: false,
  priority: 'routine',
  medicationCodeableConcept: { text: 'Aspirin 100mg' },
};

describe('T022: Multi-profile family management flow', () => {
  beforeEach(() => {
    resetTestState();
    seedPatients([existingPatient]);
    seedMedications([johnMorningMedication]);
  });

  it('allows a caregiver to manage multiple family profiles end-to-end', async () => {
    const user = userEvent.setup();

    renderAppAt('/login');

    await user.type(screen.getByLabelText(/Email Address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() =>
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'john@example.com',
        'SecurePass123!'
      )
    );

    await screen.findByRole('heading', { name: /Dashboard/i });
    await waitFor(() => expect(getUserPatientsMock).toHaveBeenCalled());

    // Initial patient context
    const profileSwitcher = screen.getByRole('combobox', { name: /Profile/i });
    expect(profileSwitcher).toHaveTextContent('John Doe');
    expect(await screen.findByText(/Upcoming medications today/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(getPatientMedicationRequestsMock).toHaveBeenCalledWith(existingPatient.id)
    );

    // Step 1: Add Emma profile
    await user.click(screen.getByRole('button', { name: /Add Profile/i }));
    const profileDialog = await screen.findByRole('dialog', { name: /New profile|Add profile/i });

    await user.clear(within(profileDialog).getByLabelText(/Full Name/i));
    await user.type(within(profileDialog).getByLabelText(/Full Name/i), 'Emma Doe');

    await user.click(within(profileDialog).getByLabelText(/Relationship/i));
    const relationshipList = await screen.findByRole('listbox');
    await user.click(within(relationshipList).getByRole('option', { name: /^Child$/i }));

    await user.click(within(profileDialog).getByLabelText(/Gender/i));
    const genderList = await screen.findByRole('listbox');
    await user.click(within(genderList).getByRole('option', { name: /^Female$/i }));

    const birthDateInput = within(profileDialog).getByLabelText(/Date of Birth/i);
    await user.clear(birthDateInput);
    await user.type(birthDateInput, '2015-03-15');

    await user.click(within(profileDialog).getByRole('button', { name: /Save Profile/i }));

    await waitFor(() =>
      expect(createPatientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Emma Doe',
          relationship: 'child',
          birthDate: '2015-03-15',
        })
      )
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: /New profile|Add profile/i })
      ).not.toBeInTheDocument()
    );

    // Step 2: Add medication for Emma
    const addMedicationButtons = await screen.findAllByRole('button', { name: /Add Medication/i });
    await user.click(addMedicationButtons[0]);
    const medicationDialog = await screen.findByRole('dialog', { name: /Add medication/i });

    await user.clear(within(medicationDialog).getByLabelText(/Medication name/i));
    await user.type(
      within(medicationDialog).getByLabelText(/Medication name/i),
      'Amoxicillin 250mg'
    );

    const timeInput = within(medicationDialog).getByLabelText(/Time of day/i);
    await user.clear(timeInput);
    await user.type(timeInput, '08:00');
    await user.click(within(medicationDialog).getByRole('button', { name: /Add time/i }));
    await user.clear(timeInput);
    await user.type(timeInput, '14:00');
    await user.click(within(medicationDialog).getByRole('button', { name: /Add time/i }));
    await user.clear(timeInput);
    await user.type(timeInput, '20:00');
    await user.click(within(medicationDialog).getByRole('button', { name: /Add time/i }));

    await user.click(within(medicationDialog).getByRole('button', { name: /Save medication/i }));

    await waitFor(() =>
      expect(createMedicationRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: expect.stringMatching(/^patient-/),
          medicationName: 'Amoxicillin 250mg',
          isPRN: false,
        })
      )
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: /Add medication/i })
      ).not.toBeInTheDocument()
    );

    // Step 3: Add Oliver profile
    await user.click(screen.getByRole('button', { name: /Add Profile/i }));
    const secondProfileDialog = await screen.findByRole('dialog', { name: /New profile|Add profile/i });

    await user.clear(within(secondProfileDialog).getByLabelText(/Full Name/i));
    await user.type(within(secondProfileDialog).getByLabelText(/Full Name/i), 'Oliver Doe');

    await user.click(within(secondProfileDialog).getByLabelText(/Relationship/i));
    const relationshipListTwo = await screen.findByRole('listbox');
    await user.click(within(relationshipListTwo).getByRole('option', { name: /^Child$/i }));

    await user.click(within(secondProfileDialog).getByLabelText(/Gender/i));
    const genderListTwo = await screen.findByRole('listbox');
    await user.click(within(genderListTwo).getByRole('option', { name: /^Male$/i }));

    const oliverBirthDate = within(secondProfileDialog).getByLabelText(/Date of Birth/i);
    await user.clear(oliverBirthDate);
    await user.type(oliverBirthDate, '2018-07-22');

    await user.click(within(secondProfileDialog).getByRole('button', { name: /Save Profile/i }));

    await waitFor(() =>
      expect(createPatientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Oliver Doe',
          relationship: 'child',
          birthDate: '2018-07-22',
        })
      )
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: /New profile|Add profile/i })
      ).not.toBeInTheDocument()
    );

    // Step 4: Add medication for Oliver
    const addMedicationButtonsSecond = await screen.findAllByRole('button', {
      name: /Add Medication/i,
    });
    await user.click(addMedicationButtonsSecond[0]);
    const oliverMedicationDialog = await screen.findByRole('dialog', { name: /Add medication/i });

    await user.clear(within(oliverMedicationDialog).getByLabelText(/Medication name/i));
    await user.type(
      within(oliverMedicationDialog).getByLabelText(/Medication name/i),
      'Vitamin D 400 IU'
    );

    const oliverTimeInput = within(oliverMedicationDialog).getByLabelText(/Time of day/i);
    await user.clear(oliverTimeInput);
    await user.type(oliverTimeInput, '09:00');
    await user.click(within(oliverMedicationDialog).getByRole('button', { name: /Add time/i }));

    await user.click(within(oliverMedicationDialog).getByRole('button', { name: /Save medication/i }));

    await waitFor(() =>
      expect(createMedicationRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          medicationName: 'Vitamin D 400 IU',
          patientId: expect.stringMatching(/^patient-/),
        })
      )
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: /Add medication/i })
      ).not.toBeInTheDocument()
    );

    // Step 5: Navigate to medications and switch profiles
    const navigation = screen.getByRole('navigation', { hidden: true });
    await user.click(within(navigation).getAllByText('Medications')[0]);
    await screen.findByRole('heading', { name: /Medications/i });

    // Emma should be active after last creation? active profile is last (Oliver). Ensure we can switch.
    const profileSelect = screen.getByRole('combobox', { name: /Profile/i });
    expect(profileSelect.textContent).toContain('Oliver Doe');

    // Oliver's medication visible
    expect(await screen.findByText('Vitamin D 400 IU')).toBeInTheDocument();
    expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
    expect(screen.queryByText('Aspirin 100mg')).not.toBeInTheDocument();

    // Switch to Emma
    await user.click(profileSelect);
    const profileListbox = await screen.findByRole('listbox');
    await user.click(within(profileListbox).getByText('Emma Doe'));

    await screen.findByText('Amoxicillin 250mg');
    expect(screen.queryByText('Vitamin D 400 IU')).not.toBeInTheDocument();
    expect(screen.queryByText('Aspirin 100mg')).not.toBeInTheDocument();

    // Switch to John
    await user.click(screen.getByRole('combobox', { name: /Profile/i }));
    const profileListboxTwo = await screen.findByRole('listbox');
    await user.click(within(profileListboxTwo).getByText('John Doe'));

    await screen.findByText('Aspirin 100mg');
    expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
    expect(screen.queryByText('Vitamin D 400 IU')).not.toBeInTheDocument();

    // Verify dashboard shows all profiles
    await user.click(within(navigation).getAllByText('Dashboard')[0]);
    await screen.findByRole('heading', { name: /Dashboard/i });
    const profileCards = screen.getAllByRole('button', { name: /View/i });
    expect(profileCards.length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Emma Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Oliver Doe').length).toBeGreaterThan(0);

    const requestedPatientIds = getPatientMedicationRequestsMock.mock.calls.map(
      ([patientId]) => patientId
    );
    expect(requestedPatientIds).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^patient-/),
        'patient-seed-john',
      ])
    );
  });
});
