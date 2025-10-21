import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Fab,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import NotificationBanner from '@/components/NotificationBanner';
import ReminderNotification from '@/components/notifications/ReminderNotification';
import {
  MedicationForm,
  MedicationFormSubmitPayload,
  MedicationList,
  MedicationLogger,
  type MedicationLoggerStatus,
} from '@/components/medication';
import { useProfileContext } from '@/contexts/ProfileContext';
import {
  createMedicationRequest,
  deleteMedicationRequest,
  getPatientMedicationRequests,
  updateMedicationRequest,
} from '@/services/firestore/medicationRequestService';
import { createReminderSchedule } from '@/services/reminders/reminderService';
import type { MedicationRequestDocument } from '@/types/fhir';
import {
  getUpcomingReminders,
  markReminderMissed,
  snoozeReminder,
  type UpcomingReminder,
} from '@/services/reminders/reminderService';

type MedicationFilter = 'all' | 'active' | 'prn' | 'completed';

const FILTER_OPTIONS: Array<{ value: MedicationFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'prn', label: 'PRN' },
  { value: 'completed', label: 'Completed' },
];

const filterMedications = (medications: MedicationRequestDocument[], filter: MedicationFilter) => {
  switch (filter) {
    case 'active':
      return medications.filter((medication) => medication.status === 'active');
    case 'prn':
      return medications.filter((medication) => Boolean(medication.isPRN));
    case 'completed':
      return medications.filter((medication) => medication.status === 'completed');
    default:
      return medications;
  }
};

const MedicationsPage: React.FC = () => {
  const {
    activeProfile,
    activeProfileId,
    isLoading: isLoadingProfiles,
    error: profileError,
  } = useProfileContext();
  const navigate = useNavigate();

  const [medications, setMedications] = useState<MedicationRequestDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MedicationFilter>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [isLoggerOpen, setLoggerOpen] = useState(false);
  const [loggerMedication, setLoggerMedication] = useState<MedicationRequestDocument | null>(null);
  const [loggerReminderContext, setLoggerReminderContext] = useState<
    { scheduleId: string; instanceId: string } | null
  >(null);
  const [loggerDefaultStatus, setLoggerDefaultStatus] =
    useState<MedicationLoggerStatus>('completed');
  const [activeReminder, setActiveReminder] = useState<UpcomingReminder | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [reminderActionLoading, setReminderActionLoading] = useState(false);

  const loadMedications = useCallback(async () => {
    if (!activeProfileId) {
      setMedications([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const items = await getPatientMedicationRequests(activeProfileId);
      setMedications(items);
    } catch (loadError) {
      console.error('Failed to load medications', loadError);
      setMedications([]);
      setError('Unable to load medications right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfileId]);

  const loadReminders = useCallback(async () => {
    if (!activeProfileId) {
      setActiveReminder(null);
      return;
    }

    setReminderLoading(true);
    setReminderError(null);

    try {
      const reminders = await getUpcomingReminders(activeProfileId, 24);
      setActiveReminder(reminders[0] ?? null);
    } catch (loadError) {
      console.error('Failed to load reminders', loadError);
      setActiveReminder(null);
      setReminderError('Unable to load reminders right now.');
    } finally {
      setReminderLoading(false);
    }
  }, [activeProfileId]);

  useEffect(() => {
    void loadMedications();
  }, [loadMedications]);

  useEffect(() => {
    void loadReminders();
  }, [loadReminders]);

  const filteredMedications = useMemo(
    () => filterMedications(medications, filter),
    [medications, filter]
  );

  const handleFilterChange = (_event: React.MouseEvent<HTMLElement>, value: MedicationFilter) => {
    if (value) {
      setFilter(value);
    }
  };

  const setActionState = (medicationId: string, active: boolean) => {
    setActionLoading((previous) => {
      if (!active) {
        const { [medicationId]: _removed, ...rest } = previous;
        return rest;
      }
      return { ...previous, [medicationId]: true };
    });
  };

  const handleLogDose = (medication: MedicationRequestDocument) => {
    setLoggerMedication(medication);
    setLoggerReminderContext(null);
    setLoggerDefaultStatus('completed');
    setLoggerOpen(true);
  };

  const handleMarkCompleted = async (medication: MedicationRequestDocument) => {
    setActionState(medication.id, true);

    try {
      await updateMedicationRequest(medication.id, { status: 'completed' });
      await loadMedications();
    } catch (updateError) {
      console.error('Failed to update medication status', updateError);
      setError('Could not update medication status. Please try again.');
    } finally {
      setActionState(medication.id, false);
    }
  };

  const handleDelete = async (medication: MedicationRequestDocument) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${medication.medicationName}? It will be marked as cancelled.`
    );
    if (!confirmed) {
      return;
    }

    setActionState(medication.id, true);

    try {
      await deleteMedicationRequest(medication.id);
      await loadMedications();
    } catch (deleteError) {
      console.error('Failed to delete medication', deleteError);
      setError('Could not delete medication. Please try again.');
    } finally {
      setActionState(medication.id, false);
    }
  };

  const handleLoggerClose = useCallback(() => {
    setLoggerOpen(false);
    setLoggerMedication(null);
    setLoggerReminderContext(null);
  }, []);

  const handleLoggerSuccess = useCallback(async () => {
    await loadMedications();
    await loadReminders();
  }, [loadMedications, loadReminders]);

  const resolveMedicationForReminder = useCallback(
    (reminder: UpcomingReminder): MedicationRequestDocument => {
      const existing = medications.find(
        (item) => item.id === reminder.schedule.medicationRequestId
      );
      if (existing) {
        return existing;
      }

      return {
        resourceType: 'MedicationRequest',
        id: reminder.schedule.medicationRequestId,
        userId: reminder.schedule.userId,
        patientId: reminder.schedule.patientId,
        medicationName: reminder.schedule.medicationName,
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: { text: reminder.schedule.medicationName },
        dosageInstruction: reminder.schedule.timing
          ? [
              {
                timing: reminder.schedule.timing,
              },
            ]
          : [],
      } as MedicationRequestDocument;
    },
    [medications]
  );

  const handleReminderLogTaken = useCallback(
    (reminder: UpcomingReminder) => {
      const medication = resolveMedicationForReminder(reminder);
      setLoggerMedication(medication);
      setLoggerDefaultStatus('completed');
      setLoggerReminderContext({
        scheduleId: reminder.scheduleId,
        instanceId: reminder.instance.id,
      });
      setLoggerOpen(true);
    },
    [resolveMedicationForReminder]
  );

  const handleReminderMarkMissed = useCallback(
    (reminder: UpcomingReminder) => {
      const medication = resolveMedicationForReminder(reminder);
      setLoggerMedication(medication);
      setLoggerDefaultStatus('not-done');
      setLoggerReminderContext({
        scheduleId: reminder.scheduleId,
        instanceId: reminder.instance.id,
      });
      setLoggerOpen(true);
    },
    [resolveMedicationForReminder]
  );

  const handleReminderSnooze = useCallback(
    async (reminder: UpcomingReminder, minutes: number) => {
      setReminderActionLoading(true);
      setReminderError(null);
      try {
        await snoozeReminder({
          scheduleId: reminder.scheduleId,
          instanceId: reminder.instance.id,
          minutes,
        });
        await loadReminders();
      } catch (snoozeError) {
        console.error('Failed to snooze reminder', snoozeError);
        setReminderError('Unable to snooze reminder. Please try again.');
      } finally {
        setReminderActionLoading(false);
      }
    },
    [loadReminders]
  );

  const handleNavigateToDetail = (medication: MedicationRequestDocument) => {
    navigate(`/medications/${medication.id}`);
  };

  const handleEdit = (medication: MedicationRequestDocument) => {
    navigate(`/medications/${medication.id}/edit`);
  };

  const disableActions = !activeProfileId || isLoading || isLoadingProfiles || isLoggerOpen;

  const handleOpenCreateDialog = () => {
    setCreateError(null);
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    if (createSubmitting) {
      return;
    }
    setCreateError(null);
    setCreateDialogOpen(false);
  };

  const handleCreateMedication = async (payload: MedicationFormSubmitPayload) => {
    if (!activeProfileId) {
      setCreateError('Select a profile before adding a medication.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const createdMedication = await createMedicationRequest({
        patientId: activeProfileId,
        medicationName: payload.medicationName,
        dosageInstruction: payload.dosageInstruction,
        isPRN: payload.isPrn,
        priority: payload.priority,
        dispenseRequest: payload.dispenseRequest,
      });

      if (!payload.isPrn) {
        try {
          await createReminderSchedule({
            medicationRequestId: createdMedication.id,
          });
        } catch (scheduleError) {
          console.error('Failed to create reminder schedule', scheduleError);
          setReminderError(
            scheduleError instanceof Error
              ? scheduleError.message
              : 'Unable to create reminder schedule. You can try again later.'
          );
        }
      }

      setCreateDialogOpen(false);
      await loadMedications();
      await loadReminders();
    } catch (createErr) {
      console.error('Failed to create medication', createErr);
      setCreateError(
        createErr instanceof Error
          ? createErr.message
          : 'Unable to create medication. Please try again.'
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  const hasNoPatient = !isLoadingProfiles && !activeProfileId;
  const showEmptyState =
    !isLoading && activeProfileId && filteredMedications.length === 0 && !error;

  return (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Medications
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {activeProfile
              ? `Managing prescriptions for ${activeProfile.name?.[0]?.text ?? 'this profile'}.`
              : 'Select a profile to view and manage medications.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={handleFilterChange}
            size="small"
            aria-label="Filter medications"
          >
            {FILTER_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Tooltip title="Refresh medication list">
            <span>
              <Button
                variant="outlined"
                startIcon={isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={() => loadMedications()}
                disabled={isLoading}
                aria-label="Refresh medications"
              >
                Refresh
              </Button>
            </span>
          </Tooltip>
          <Tooltip
            title={
              activeProfileId
                ? 'Add a new medication'
                : 'Select a profile before adding medications'
            }
          >
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateDialog}
                disabled={!activeProfileId || createSubmitting || isLoadingProfiles}
              >
                Add Medication
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      <NotificationBanner
        id="medications-error"
        visible={Boolean(error)}
        severity="error"
        icon={<WarningAmberIcon fontSize="inherit" />}
      >
        {error}
      </NotificationBanner>

      <NotificationBanner
        id="reminder-error"
        visible={Boolean(reminderError)}
        severity="warning"
        icon={<WarningAmberIcon fontSize="inherit" />}
      >
        {reminderError}
      </NotificationBanner>

      <NotificationBanner
        id="medications-no-patient"
        visible={hasNoPatient}
        severity="info"
        icon={<WarningAmberIcon fontSize="inherit" />}
      >
        {profileError ?? 'Select a profile in the header to manage medications.'}
      </NotificationBanner>

      {(isLoadingProfiles || isLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {activeReminder && activeProfileId && !reminderLoading && (
        <ReminderNotification
          medicationName={activeReminder.schedule.medicationName}
          patientName={activeProfile?.name?.[0]?.text}
          scheduledTime={activeReminder.instance.effectiveDateTime.toDate()}
          isProcessing={reminderActionLoading}
          onLogTaken={() => handleReminderLogTaken(activeReminder)}
          onMarkMissed={() => handleReminderMarkMissed(activeReminder)}
          onSnooze={(minutes) => handleReminderSnooze(activeReminder, minutes)}
        />
      )}

      {!isLoading && activeProfileId && filteredMedications.length > 0 && (
        <MedicationList
          medications={filteredMedications}
          actionLoadingMap={actionLoading}
          disableActions={disableActions}
          onLogDose={handleLogDose}
          onEdit={handleEdit}
          onMarkCompleted={handleMarkCompleted}
          onDelete={handleDelete}
          onOpenDetail={handleNavigateToDetail}
        />
      )}

      {showEmptyState && (
        <Alert severity="info">
          {filter === 'all'
            ? 'No medications found for this profile yet.'
            : `No ${filter === 'prn' ? 'PRN' : filter} medications found for this profile.`}
        </Alert>
      )}

      <Tooltip
        title={
          activeProfileId
            ? 'Add a new medication'
            : 'Select a profile before adding medications'
        }
      >
        <span>
          <Fab
            color="primary"
            aria-label="Add medication"
            sx={{ position: 'fixed', bottom: 32, right: 32 }}
            onClick={handleOpenCreateDialog}
            disabled={!activeProfileId || createSubmitting || isLoadingProfiles}
          >
            <AddIcon />
          </Fab>
        </span>
      </Tooltip>

      <Dialog
        open={isCreateDialogOpen}
        onClose={handleCloseCreateDialog}
        fullWidth
        maxWidth="md"
        aria-labelledby="create-medication-title"
      >
        <DialogTitle id="create-medication-title">Add medication</DialogTitle>
        <DialogContent dividers>
          <MedicationForm
            submitting={createSubmitting}
            errorMessage={createError}
            onSubmit={handleCreateMedication}
            onCancel={handleCloseCreateDialog}
          />
        </DialogContent>
      </Dialog>

      <MedicationLogger
        open={isLoggerOpen}
        medication={loggerMedication}
        defaultStatus={loggerDefaultStatus}
        reminderContext={loggerReminderContext}
        onClose={handleLoggerClose}
        onSuccess={handleLoggerSuccess}
      />
    </Box>
  );
};

export default MedicationsPage;
