
import React, { useEffect, useMemo, useState } from 'react';
import {
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
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  FamilyRestroom as FamilyRestroomIcon,
  Medication as MedicationIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import NotificationBanner from '@/components/NotificationBanner';
import { useLayoutContext } from '@/components/Layout';
import { getPatientMedicationRequests } from '@/services/firestore/medicationRequestService';
import { getPatientMedicationLogs } from '@/services/firestore/medicationAdministrationService';
import type {
  MedicationAdministrationDocument,
  MedicationRequestDocument,
  PatientDocument,
} from '@/types/fhir';

interface UpcomingMedication {
  id: string;
  medicationName: string;
  scheduledTime: Date | null;
  isPrn: boolean;
  priority?: MedicationRequestDocument['priority'];
}

interface AdherenceSummary {
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  adherenceRate: number;
}

const getPatientDisplayName = (patient: PatientDocument | null | undefined): string => {
  if (!patient) {
    return 'No profile selected';
  }

  const name = patient.name?.[0];
  if (name?.text) {
    return name.text;
  }

  if (name?.given?.length) {
    return name.given.join(' ');
  }

  return 'Unnamed Profile';
};

const getPatientInitial = (patient: PatientDocument): string => {
  const label = getPatientDisplayName(patient);
  return label.trim().charAt(0).toUpperCase() || '?';
};

const getRelationshipLabel = (patient: PatientDocument | null | undefined): string => {
  if (!patient?.relationship) {
    return '—';
  }
  return patient.relationship.replace(/_/g, ' ');
};

const toDate = (value: Timestamp | string | Date | undefined): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getLastNDaysRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(end.getDate() - (days - 1));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

const parseTimeToToday = (timeString: string): Date | null => {
  const [hours, minutes = '0', seconds = '0'] = timeString.split(':');
  if (hours === undefined) {
    return null;
  }

  const parsedHours = Number.parseInt(hours, 10);
  const parsedMinutes = Number.parseInt(minutes, 10);
  const parsedSeconds = Number.parseInt(seconds, 10);

  if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes) || Number.isNaN(parsedSeconds)) {
    return null;
  }

  const now = new Date();
  const result = new Date(now);
  result.setHours(parsedHours, parsedMinutes, parsedSeconds, 0);
  return result;
};

const computeUpcomingMedications = (
  medications: MedicationRequestDocument[]
): UpcomingMedication[] => {
  const now = new Date();
  const upcoming: UpcomingMedication[] = [];

  medications
    .filter((medication) => medication.status === 'active')
    .forEach((medication) => {
      const dosage = medication.dosageInstruction?.[0];
      const times = dosage?.timing?.repeat?.timeOfDay;

      if (times && times.length > 0) {
        times.forEach((time) => {
          const scheduledTime = parseTimeToToday(time);
          if (scheduledTime && scheduledTime >= now) {
            upcoming.push({
              id: `${medication.id}-${time}`,
              medicationName: medication.medicationName,
              scheduledTime,
              isPrn: Boolean(medication.isPRN),
              priority: medication.priority,
            });
          }
        });
      } else {
        upcoming.push({
          id: `${medication.id}-prn`,
          medicationName: medication.medicationName,
          scheduledTime: null,
          isPrn: true,
          priority: medication.priority,
        });
      }
    });

  return upcoming
    .sort((first, second) => {
      if (!first.scheduledTime && !second.scheduledTime) {
        return 0;
      }
      if (!first.scheduledTime) {
        return 1;
      }
      if (!second.scheduledTime) {
        return -1;
      }
      return first.scheduledTime.getTime() - second.scheduledTime.getTime();
    })
    .slice(0, 4);
};

const getLogChip = (status: MedicationAdministrationDocument['status']) => {
  switch (status) {
    case 'completed':
      return {
        label: 'Taken',
        color: 'success' as const,
        icon: <CheckCircleIcon fontSize="small" />,
      };
    case 'not-done':
      return {
        label: 'Missed',
        color: 'warning' as const,
        icon: <WarningAmberIcon fontSize="small" />,
      };
    case 'on-hold':
      return {
        label: 'On hold',
        color: 'info' as const,
        icon: <ScheduleIcon fontSize="small" />,
      };
    case 'stopped':
      return {
        label: 'Stopped',
        color: 'default' as const,
        icon: <ScheduleIcon fontSize="small" />,
      };
    default:
      return {
        label: status,
        color: 'default' as const,
        icon: <ScheduleIcon fontSize="small" />,
      };
  }
};

const DEFAULT_ADHERENCE_SUMMARY: AdherenceSummary = {
  totalScheduled: 0,
  totalTaken: 0,
  totalMissed: 0,
  adherenceRate: 0,
};

const DashboardPage: React.FC = () => {
  const { patients, selectedPatient, selectedPatientId, selectPatient, isLoadingPatients } =
    useLayoutContext();
  const [medicationRequests, setMedicationRequests] = useState<MedicationRequestDocument[]>([]);
  const [recentLogs, setRecentLogs] = useState<MedicationAdministrationDocument[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    if (!selectedPatientId) {
      setMedicationRequests([]);
      setRecentLogs([]);
      setIsLoadingDetails(false);
      return () => {
        isSubscribed = false;
      };
    }

    setIsLoadingDetails(true);
    setDetailsError(null);

    const load = async () => {
      try {
        const [requests, logs] = await Promise.all([
          getPatientMedicationRequests(selectedPatientId),
          getPatientMedicationLogs(selectedPatientId, getLastNDaysRange(7)),
        ]);

        if (!isSubscribed) {
          return;
        }

        setMedicationRequests(requests);
        setRecentLogs(logs);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
        if (isSubscribed) {
          setMedicationRequests([]);
          setRecentLogs([]);
          setDetailsError('Unable to load dashboard data right now. Please try again.');
        }
      } finally {
        if (isSubscribed) {
          setIsLoadingDetails(false);
        }
      }
    };

    void load();

    return () => {
      isSubscribed = false;
    };
  }, [selectedPatientId]);

  const adherenceSummary = useMemo<AdherenceSummary>(() => {
    if (recentLogs.length === 0) {
      return DEFAULT_ADHERENCE_SUMMARY;
    }

    const relevantLogs = recentLogs.filter(
      (log) => log.status === 'completed' || log.status === 'not-done'
    );

    if (relevantLogs.length === 0) {
      return DEFAULT_ADHERENCE_SUMMARY;
    }

    const totalTaken = relevantLogs.filter((log) => log.status === 'completed').length;
    const totalMissed = relevantLogs.filter((log) => log.status === 'not-done').length;
    const totalScheduled = totalTaken + totalMissed;
    const adherenceRate = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;

    return {
      totalScheduled,
      totalTaken,
      totalMissed,
      adherenceRate: Math.round(adherenceRate * 10) / 10,
    };
  }, [recentLogs]);

  const upcomingMedications = useMemo(
    () => computeUpcomingMedications(medicationRequests),
    [medicationRequests]
  );

  const recentLogItems = useMemo(
    () => recentLogs.slice(0, 5),
    [recentLogs]
  );

  const headingSubtitle = useMemo(() => {
    if (!selectedPatientId) {
      if (patients.length === 0) {
        return 'Add a profile to start tracking adherence.';
      }
      return 'Select a profile to view adherence insights.';
    }

    return `Monitoring ${getPatientDisplayName(selectedPatient)} (${getRelationshipLabel(
      selectedPatient
    )})`;
  }, [patients.length, selectedPatient, selectedPatientId]);

  const showSelectPatientBanner =
    !isLoadingPatients && patients.length > 0 && !selectedPatientId;

  const showEmptyState =
    !isLoadingPatients && !isLoadingDetails && selectedPatientId && medicationRequests.length === 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {headingSubtitle}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Profile creation coming soon">
            <span>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<FamilyRestroomIcon />}
                disabled
              >
                Add Profile
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Medication creation coming soon">
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<MedicationIcon />}
                disabled
              >
                Add Medication
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      <NotificationBanner
        id="dashboard-error"
        visible={Boolean(detailsError)}
        severity="error"
        icon={<WarningAmberIcon fontSize="inherit" />}
      >
        {detailsError}
      </NotificationBanner>

      <NotificationBanner
        id="dashboard-select-patient"
        visible={showSelectPatientBanner}
        severity="info"
        icon={<PersonIcon fontSize="inherit" />}
      >
        Select a profile below to see adherence insights.
      </NotificationBanner>

      <NotificationBanner
        id="dashboard-no-patients"
        visible={!isLoadingPatients && patients.length === 0}
        severity="info"
        icon={<FamilyRestroomIcon fontSize="inherit" />}
      >
        No profiles yet. Add a profile to start tracking medications.
      </NotificationBanner>

      {(isLoadingPatients || isLoadingDetails) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <TrendingUpIcon />
                </Avatar>
              }
              title="Adherence (7 days)"
              subheader={selectedPatient ? getPatientDisplayName(selectedPatient) : '—'}
            />
            <CardContent>
              {adherenceSummary.totalScheduled === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No doses have been logged in the last 7 days.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h3">
                      {adherenceSummary.adherenceRate.toFixed(1)}%
                    </Typography>
                    <Chip
                      label={`${adherenceSummary.totalTaken}/${adherenceSummary.totalScheduled} doses taken`}
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, adherenceSummary.adherenceRate))}
                    color="primary"
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  <Stack direction="row" spacing={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Taken
                      </Typography>
                      <Typography variant="body1">{adherenceSummary.totalTaken}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Missed
                      </Typography>
                      <Typography variant="body1">{adherenceSummary.totalMissed}</Typography>
                    </Box>
                  </Stack>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <ScheduleIcon />
                </Avatar>
              }
              title="Upcoming medications today"
              subheader={
                upcomingMedications.length > 0
                  ? `${upcomingMedications.length} dose${
                      upcomingMedications.length > 1 ? 's' : ''
                    } remaining`
                  : 'No remaining scheduled doses for today'
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {upcomingMedications.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Everything looks good. No additional doses are scheduled today.
                </Typography>
              ) : (
                <List disablePadding>
                  {upcomingMedications.map((upcoming, index) => (
                    <React.Fragment key={upcoming.id}>
                      <ListItem
                        secondaryAction={
                          upcoming.scheduledTime ? (
                            <Typography variant="body2" color="text.secondary">
                              {format(upcoming.scheduledTime, 'p')}
                            </Typography>
                          ) : (
                            <Chip label="As needed" size="small" />
                          )
                        }
                      >
                        <ListItemAvatar>
                          <Avatar>
                            <MedicationIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={upcoming.medicationName}
                          secondary={
                            upcoming.priority ? `Priority: ${upcoming.priority}` : undefined
                          }
                        />
                      </ListItem>
                      {index < upcomingMedications.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Patient Profiles
          </Typography>
          <Grid container spacing={2}>
            {patients.map((patient) => (
              <Grid item xs={12} sm={6} md={4} key={patient.id}>
                <Card variant={patient.id === selectedPatientId ? 'outlined' : undefined}>
                  <CardHeader
                    avatar={
                      <Avatar src={patient.photo?.[0]?.url ?? undefined}>
                        {getPatientInitial(patient)}
                      </Avatar>
                    }
                    title={getPatientDisplayName(patient)}
                    subheader={getRelationshipLabel(patient)}
                    action={
                      patient.id === selectedPatientId ? (
                        <Chip label="Selected" color="primary" size="small" />
                      ) : null
                    }
                  />
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => selectPatient(patient.id)}
                      disabled={patient.id === selectedPatientId}
                    >
                      View
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
            {patients.length === 0 && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Add your first profile to see adherence insights here.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircleIcon />
                </Avatar>
              }
              title="Recent medication logs"
              subheader="Last 5 entries"
            />
            <CardContent sx={{ pt: 0 }}>
              {recentLogItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No medication logs recorded yet for this profile.
                </Typography>
              ) : (
                <List disablePadding>
                  {recentLogItems.map((log, index) => {
                    const date = toDate(log.effectiveDateTime);
                    const chip = getLogChip(log.status);
                    const secondaryLines: string[] = [];

                    if (date) {
                      const formattedDate = format(date, isToday(date) ? 'p' : 'MMM d, p');
                      secondaryLines.push(formattedDate);
                      secondaryLines.push(`${formatDistanceToNow(date, { addSuffix: true })}`);
                    }

                    if (log.note?.length) {
                      secondaryLines.push(log.note[log.note.length - 1]?.text ?? '');
                    }

                    return (
                      <React.Fragment key={log.id}>
                        <ListItem
                          secondaryAction={
                            <Chip
                              label={chip.label}
                              color={chip.color}
                              size="small"
                              icon={chip.icon}
                            />
                          }
                        >
                          <ListItemAvatar>
                            <Avatar>
                              <MedicationIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={log.medicationCodeableConcept?.text ?? 'Medication'}
                            secondary={secondaryLines.filter(Boolean).join(' • ')}
                          />
                        </ListItem>
                        {index < recentLogItems.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <PersonIcon />
                </Avatar>
              }
              title="Caregiver notes"
              subheader="Latest context from medication logs"
            />
            <CardContent>
              {recentLogItems.some((log) => log.note?.length) ? (
                <Stack spacing={2}>
                  {recentLogItems
                    .filter((log) => log.note?.length)
                    .map((log) => {
                      const date = toDate(log.effectiveDateTime);
                      const note = log.note?.[log.note.length - 1]?.text ?? '';
                      return (
                        <Box
                          key={`${log.id}-note`}
                          sx={{
                            borderRadius: 2,
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            p: 2,
                          }}
                        >
                          <Typography variant="subtitle2" gutterBottom>
                            {log.medicationCodeableConcept?.text ?? 'Medication'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {note}
                          </Typography>
                          {date && (
                            <Typography variant="caption" color="text.secondary">
                              Logged {formatDistanceToNow(date, { addSuffix: true })}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No caregiver notes have been added yet. Notes from medication logs will appear
                  here.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {showEmptyState && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body1" gutterBottom>
              No medications found for this profile.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use the Add Medication button to start tracking prescriptions once the workflow is
              available.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DashboardPage;
