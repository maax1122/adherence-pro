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
import { useLayoutContext } from '@/components/Layout';
import {
  createMedicationRequest,
  deleteMedicationRequest,
  getPatientMedicationRequests,
  updateMedicationRequest,
} from '@/services/firestore/medicationRequestService';
import { logMedication } from '@/services/firestore/medicationAdministrationService';
import type { MedicationRequestDocument } from '@/types/fhir';
import {
  MedicationForm,
  MedicationFormSubmitPayload,
  MedicationList,
} from '@/components/medication';

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
    selectedPatient,
    selectedPatientId,
    isLoadingPatients,
    patientError: layoutPatientError,
  } = useLayoutContext();
  const navigate = useNavigate();

  const [medications, setMedications] = useState<MedicationRequestDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MedicationFilter>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const loadMedications = useCallback(async () => {
    if (!selectedPatientId) {
      setMedications([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const items = await getPatientMedicationRequests(selectedPatientId);
      setMedications(items);
    } catch (loadError) {
      console.error('Failed to load medications', loadError);
      setMedications([]);
      setError('Unable to load medications right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    void loadMedications();
  }, [loadMedications]);

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

  const handleLogDose = async (medication: MedicationRequestDocument) => {
    setActionState(medication.id, true);

    try {
      await logMedication({
        medicationRequestId: medication.id,
        status: 'completed',
        effectiveDateTime: new Date(),
      });
      await loadMedications();
    } catch (logError) {
      console.error('Failed to log medication dose', logError);
      setError('Could not log the medication dose. Please try again.');
    } finally {
      setActionState(medication.id, false);
    }
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

  const handleNavigateToDetail = (medication: MedicationRequestDocument) => {
    navigate(`/medications/${medication.id}`);
  };

  const handleEdit = (medication: MedicationRequestDocument) => {
    navigate(`/medications/${medication.id}/edit`);
  };

  const disableActions = !selectedPatientId || isLoading || isLoadingPatients;

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
    if (!selectedPatientId) {
      setCreateError('Select a profile before adding a medication.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    try {
      await createMedicationRequest({
        patientId: selectedPatientId,
        medicationName: payload.medicationName,
        dosageInstruction: payload.dosageInstruction,
        isPRN: payload.isPrn,
        priority: payload.priority,
        dispenseRequest: payload.dispenseRequest,
      });
      setCreateDialogOpen(false);
      await loadMedications();
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

  const hasNoPatient = !isLoadingPatients && !selectedPatientId;
  const showEmptyState =
    !isLoading && selectedPatientId && filteredMedications.length === 0 && !error;

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
            {selectedPatient
              ? `Managing prescriptions for ${selectedPatient.name?.[0]?.text ?? 'this profile'}.`
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
              selectedPatientId
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
                disabled={!selectedPatientId || createSubmitting || isLoadingPatients}
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
        id="medications-no-patient"
        visible={hasNoPatient}
        severity="info"
        icon={<WarningAmberIcon fontSize="inherit" />}
      >
        {layoutPatientError ?? 'Select a profile in the header to manage medications.'}
      </NotificationBanner>

      {(isLoadingPatients || isLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && selectedPatientId && filteredMedications.length > 0 && (
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
          selectedPatientId
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
            disabled={!selectedPatientId || createSubmitting || isLoadingPatients}
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
    </Box>
  );
};

export default MedicationsPage;
