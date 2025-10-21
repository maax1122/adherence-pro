import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PatientDocument } from '@/types/fhir';
import {
  resetTestState,
  seedPatients,
  setAuthUser,
  setPatientLookup,
  renderAppAt,
  createMedicationRequestMock,
  createReminderScheduleMock,
  getUpcomingRemindersMock,
  snoozeReminderMock,
  logMedicationMock,
  markReminderCompletedMock,
} from './utils/appTestUtils';
import { mockReminderSchedules } from './utils/appTestUtils';

describe('T033: Medication reminders integration', () => {
  const patient: PatientDocument = {
    resourceType: 'Patient',
    id: 'patient-reminder-1',
    userId: 'user-123',
    active: true,
    name: [{ text: 'John Reminder' }],
    relationship: 'self',
  };

  beforeEach(() => {
    resetTestState();
    seedPatients([patient]);
    setPatientLookup((id) => (id === patient.id ? patient : null));
  });

  it('creates reminder schedules and logs intake from reminder notification', async () => {
    const user = userEvent.setup();

    setAuthUser({ uid: 'user-123', email: 'john@example.com', displayName: 'John Reminder' });
    renderAppAt('/medications');

    await waitFor(() => expect(getUpcomingRemindersMock).toHaveBeenCalled());

    const addMedicationButtons = await screen.findAllByRole('button', { name: /Add Medication/i });
    await user.click(addMedicationButtons[0]);

    const medicationDialog = await screen.findByRole('dialog', { name: /Add medication/i });

    await user.clear(within(medicationDialog).getByLabelText(/Medication name/i));
    await user.type(
      within(medicationDialog).getByLabelText(/Medication name/i),
      'Test Medication 5mg'
    );

    await user.clear(within(medicationDialog).getByLabelText(/Dosage amount/i));
    await user.type(within(medicationDialog).getByLabelText(/Dosage amount/i), '5');

    const timeInput = within(medicationDialog).getByLabelText(/Time of day/i);
    await user.clear(timeInput);
    await user.type(timeInput, '08:00');
    await user.click(within(medicationDialog).getByRole('button', { name: /Add time/i }));

    await user.click(within(medicationDialog).getByRole('button', { name: /Save medication/i }));

    await waitFor(() => expect(createMedicationRequestMock).toHaveBeenCalled());
    await waitFor(() => expect(createReminderScheduleMock).toHaveBeenCalled());
    await waitFor(() => expect(getUpcomingRemindersMock.mock.calls.length).toBeGreaterThan(1));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: /Add medication/i })
      ).not.toBeInTheDocument()
    );

    const reminderHeading = await screen.findByText(/Upcoming reminder/i);
    expect(reminderHeading).toBeInTheDocument();

    const reminderCard = reminderHeading.closest('.MuiCard-root') ?? reminderHeading.parentElement;
    expect(reminderCard).not.toBeNull();
    expect(within(reminderCard as HTMLElement).getByText('Test Medication 5mg')).toBeInTheDocument();

    expect(mockReminderSchedules).toHaveLength(1);
    const [schedule] = mockReminderSchedules;
    expect(schedule.medicationName).toBe('Test Medication 5mg');
    const [initialInstance] = schedule.instances;
    expect(initialInstance).toBeDefined();

    const addMedicationCall = createMedicationRequestMock.mock.calls.at(-1)?.[0];
    expect(addMedicationCall).toMatchObject({
      patientId: patient.id,
      medicationName: 'Test Medication 5mg',
    });

    const reminderScheduleCall = createReminderScheduleMock.mock.calls.at(-1)?.[0];
    expect(reminderScheduleCall).toMatchObject({
      medicationRequestId: schedule.medicationRequestId,
    });

    const remindersCallCountBeforeSnooze = getUpcomingRemindersMock.mock.calls.length;
    const snoozeFive = screen.getByRole('button', { name: /^5 min$/i });

    await user.click(snoozeFive);
    await waitFor(() =>
      expect(snoozeReminderMock).toHaveBeenCalledWith({
        scheduleId: schedule.id,
        instanceId: initialInstance.id,
        minutes: 5,
      })
    );

    await waitFor(() =>
      expect(getUpcomingRemindersMock.mock.calls.length).toBeGreaterThan(remindersCallCountBeforeSnooze)
    );

    await waitFor(() =>
      expect(mockReminderSchedules[0].instances[0].effectiveDateTime.toMillis()).toBeGreaterThan(
        initialInstance.effectiveDateTime.toMillis()
      )
    );

    const logTakenButton = screen.getByRole('button', { name: /Log taken/i });
    await user.click(logTakenButton);

    const loggerDialog = await screen.findByRole('dialog', { name: /Log medication/i });
    await user.click(within(loggerDialog).getByRole('button', { name: /Save log/i }));

    await waitFor(() =>
      expect(logMedicationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          reminderInstanceId: initialInstance.id,
          medicationRequestId: expect.any(String),
        })
      )
    );

    await waitFor(() =>
      expect(markReminderCompletedMock).toHaveBeenCalledWith(
        schedule.id,
        initialInstance.id,
        expect.any(String)
      )
    );

    await waitFor(() =>
      expect(screen.queryByText(/Upcoming reminder/i)).not.toBeInTheDocument()
    );

    await waitFor(() => {
      const updatedInstance = mockReminderSchedules[0].instances.find(
        (instance) => instance.id === initialInstance.id
      );
      expect(updatedInstance?.status).toBe('completed');
    });
  });
});
