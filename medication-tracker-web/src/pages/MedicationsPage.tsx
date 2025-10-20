import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Fab,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Medication as MedicationIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import NotificationBanner from '@/components/NotificationBanner';
import { useLayoutContext } from '@/components/Layout';
import {
  deleteMedicationRequest,
  getPatientMedicationRequests,
  updateMedicationRequest,
} from '@/services/firestore/medicationRequestService';
import { logMedication } from '@/services/firestore/medicationAdministrationService';
import type { MedicationRequestDocument } from '@/types/fhir';

type MedicationFilter = 'all' | 'active' | 'prn' | 'completed';

interface StatusStyle {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon: React.ReactElement;
}

const FILTER_OPTIONS: Array<{ value: MedicationFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'prn', label: 'PRN' },
  { value: 'completed', label: 'Completed' },
];

const statusBadge = (status: MedicationRequestDocument['status']): StatusStyle => {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        color: 'success',
        icon: <CheckCircleIcon fontSize="small" />,
      };
    case 'completed':
      return {
        label: 'Completed',
        color: 'primary',
        icon: <CheckCircleIcon fontSize="small" />,
      };
    case 'on-hold':
      return {
        label: 'On hold',
        color: 'warning',
        icon: <WarningAmberIcon fontSize="small" />,
      };
    case 'stopped':
    case 'cancelled':
      return {
        label: 'Inactive',
        color: 'default',
        icon: <WarningAmberIcon fontSize="small" />,
      };
    default:
      return {
        label: status,
        color: 'info',
        icon: <MedicationIcon fontSize="small" />,
      };
  }
};

const getMedicationInitial = (medication: MedicationRequestDocument): string => {
  const name = medication.medicationName?.trim();
  if (name) {
    return name.charAt(0).toUpperCase();
  }
  return 'M';
};

const formatDosage = (medication: MedicationRequestDocument): string | null => {
  const dosage = medication.dosageInstruction?.[0];
  if (!dosage) {
    return null;
  }

  if (dosage.text) {
    return dosage.text;
  }

  if (dosage.patientInstruction) {
    return dosage.patientInstruction;
  }

  if (dosage.doseAndRate?.length) {
    const quantity = dosage.doseAndRate[0]?.doseQuantity;
    if (quantity?.value) {
      return `${quantity.value}${quantity.unit ? ` ${quantity.unit}` : ''}`;
    }
  }

  return null;
};

const formatFrequency = (medication: MedicationRequestDocument): string | null => {
  const repeat = medication.dosageInstruction?.[0]?.timing?.repeat;
  if (!repeat) {
    return null;
  }

  if (repeat.timeOfDay && repeat.timeOfDay.length > 0) {
    const formattedTimes = repeat.timeOfDay.map((time) => {
      const [hours = '0', minutes = '0'] = time.split(':');
      const parsedHours = Number.parseInt(hours, 10);
      const parsedMinutes = Number.parseInt(minutes, 10);
      if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) {
        return time;
      }

      const date = new Date();
      date.setHours(parsedHours, parsedMinutes, 0, 0);
      return format(date, 'p');
    });
    return `Take at ${formattedTimes.join(', ')}`;
  }

  if (repeat.frequency && repeat.period && repeat.periodUnit) {
    const units: Record<string, string> = {
      h: 'hour',
      d: 'day',
      wk: 'week',
      mo: 'month',
    };
    const unit = units[repeat.periodUnit] || repeat.periodUnit;
    const freq = repeat.frequency === 1 ? 'Once' : `${repeat.frequency} times`;
    const period =
      repeat.period === 1 ? unit : `${repeat.period} ${unit}${repeat.period > 1 ? 's' : ''}`;
    return `${freq} every ${period}`;
  }

  if (repeat?.count) {
    return `Total of ${repeat.count} doses`;
  }

  return null;
};

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
  const { selectedPatient, selectedPatientId, isLoadingPatients } = useLayoutContext();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [medications, setMedications] = useState<MedicationRequestDocument[]>([]);
  const [filter, setFilter] = useState<MedicationFilter>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

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
        <Stack direction="row" spacing={1.5}>
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={handleFilterChange}
            size="small"
            aria-label="Medication filter"
          >
            {FILTER_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value} aria-label={option.label}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Tooltip title="Refresh medication list">
            <span>
              <IconButton
                aria-label="Refresh medications"
                onClick={() => {
                  void loadMedications();
                }}
                disabled={disableActions}
              >
                {isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      <NotificationBanner
        id="medications-error-banner"
        visible={Boolean(error)}
        severity="error"
        icon={<WarningAmberIcon fontSize="inherit" />}
      >
        {error}
      </NotificationBanner>

      <NotificationBanner
        id="medications-no-patient"
        visible={!isLoadingPatients && !selectedPatientId}
        severity="info"
        icon={<MedicationIcon fontSize="inherit" />}
      >
        Select a profile in the header to manage medications.
      </NotificationBanner>

      {(isLoadingPatients || isLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && selectedPatientId && filteredMedications.length === 0 && (
        <Alert severity="info">
          {filter === 'all'
            ? 'No medications found for this profile yet.'
            : `No ${filter === 'prn' ? 'PRN' : filter} medications found for this profile.`}
        </Alert>
      )}

      <Grid container spacing={3}>
        {filteredMedications.map((medication) => {
          const badge = statusBadge(medication.status);
          const dosage = formatDosage(medication);
          const frequency = formatFrequency(medication);
          const isActionLoading = Boolean(actionLoading[medication.id]);

          return (
            <Grid item xs={12} md={6} key={medication.id}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: (theme) =>
                    theme.transitions.create('box-shadow', { duration: theme.transitions.duration.shortest }),
                  '&:hover': {
                    boxShadow: 3,
                  },
                }}
                onClick={() => handleNavigateToDetail(medication)}
              >
                <CardHeader
                  avatar={
                    <Avatar>
                      <MedicationIcon />
                    </Avatar>
                  }
                  title={medication.medicationName}
                  subheader={
                    medication.priority ? `Priority: ${medication.priority.toUpperCase()}` : undefined
                  }
                  action={
                    <Stack direction="row" spacing={1} alignItems="center">
                      {medication.isPRN && <Chip label="PRN" size="small" color="info" />}
                      <Chip
                        label={badge.label}
                        color={badge.color}
                        size="small"
                        icon={badge.icon}
                      />
                    </Stack>
                  }
                />
                <CardContent>
                  <List dense disablePadding>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {getMedicationInitial(medication)}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary="Dosage"
                        secondary={dosage || 'Not specified'}
                        primaryTypographyProps={{ variant: 'subtitle2' }}
                      />
                    </ListItem>
                    <Divider component="li" />
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                          <ScheduleIcon fontSize="small" />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary="Frequency"
                        secondary={frequency || (medication.isPRN ? 'As needed' : 'Not specified')}
                        primaryTypographyProps={{ variant: 'subtitle2' }}
                      />
                    </ListItem>
                  </List>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="contained"
                      size="small"
                      color="primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleLogDose(medication);
                      }}
                      disabled={isActionLoading || medication.status !== 'active'}
                    >
                      {isActionLoading ? <CircularProgress size={16} /> : 'Log dose'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(medication);
                      }}
                    >
                      Edit
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Mark medication as completed">
                      <span>
                        <IconButton
                          color="success"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleMarkCompleted(medication);
                          }}
                          disabled={isActionLoading || medication.status === 'completed'}
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete medication">
                      <span>
                        <IconButton
                          color="error"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(medication);
                          }}
                          disabled={isActionLoading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Tooltip title="Add medication (coming soon)">
        <span>
          <Fab
            color="primary"
            aria-label="Add medication"
            sx={{ position: 'fixed', bottom: 32, right: 32 }}
            disabled
          >
            <AddIcon />
          </Fab>
        </span>
      </Tooltip>
    </Box>
  );
};

export default MedicationsPage;
