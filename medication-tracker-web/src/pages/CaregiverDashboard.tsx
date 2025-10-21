import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Chip,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AlarmOn as AlarmOnIcon,
  CheckCircle as CheckCircleIcon,
  Diversity3 as Diversity3Icon,
  ErrorOutline as ErrorOutlineIcon,
  HourglassBottom as HourglassBottomIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon,
  WarningAmber as WarningAmberIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import NotificationBanner from '@/components/NotificationBanner';
import { useAuth } from '@/contexts/AuthContext';
import {
  acceptInvitation,
  getCaregiverConnections,
  getPendingInvitationsForCurrentUser,
  rejectInvitation,
} from '@/services/firestore/familyConnectionService';
import { getPatient } from '@/services/firestore/patientService';
import {
  getPatientMedicationLogs,
} from '@/services/firestore/medicationAdministrationService';
import type {
  FamilyConnection,
  MedicationAdministrationDocument,
  PatientDocument,
} from '@/types/fhir';
import {
  notifyCaregiverInvitationAccepted,
  notifyCaregiverMissedDose,
} from '@/services/notifications/notificationService';

interface PatientMetrics {
  totalLogs: number;
  taken: number;
  missed: number;
}

interface RecentActivityItem {
  id: string;
  patientId: string;
  patientName: string;
  medicationName?: string;
  status: 'taken' | 'missed' | 'taken_late';
  recordedAt: Timestamp;
  performerName?: string;
  scheduledTime?: Timestamp | null;
}

const getLastNDaysRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  const toDateString = (date: Date) => date.toISOString().slice(0, 10);

  return {
    start: toDateString(start),
    end: toDateString(end),
  };
};

const getAdministrationStatus = (
  log: MedicationAdministrationDocument
): 'taken' | 'missed' | 'taken_late' => {
  if (log.administrationStatus) {
    return log.administrationStatus;
  }

  if (log.status === 'not-done') {
    return 'missed';
  }

  return 'taken';
};

const CaregiverDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<FamilyConnection[]>([]);
  const [pendingInvites, setPendingInvites] = useState<FamilyConnection[]>([]);
  const [patientMap, setPatientMap] = useState<Record<string, PatientDocument | null>>({});
  const [patientMetrics, setPatientMetrics] = useState<Record<string, PatientMetrics>>({});
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const notifiedMissedRef = useRef<Set<string>>(new Set());

  const loadDashboard = useCallback(async () => {
    if (!currentUser) {
      setConnections([]);
      setPendingInvites([]);
      setPatientMap({});
      setPatientMetrics({});
      setRecentActivity([]);
      return;
    }

    const [acceptedConnections, pending] = await Promise.all([
      getCaregiverConnections(),
      getPendingInvitationsForCurrentUser(),
    ]);

    setConnections(acceptedConnections);
    setPendingInvites(pending);

    if (acceptedConnections.length === 0) {
      setPatientMap({});
      setPatientMetrics({});
      setRecentActivity([]);
      return;
    }

    const patientIds = Array.from(new Set(acceptedConnections.map((conn) => conn.patientId)));

    const patients = await Promise.all(
      patientIds.map(async (id) => ({
        id,
        patient: await getPatient(id),
      }))
    );

    const patientRecord: Record<string, PatientDocument | null> = {};
    patients.forEach(({ id, patient }) => {
      patientRecord[id] = patient;
    });
    setPatientMap(patientRecord);

    const range = getLastNDaysRange(7);
    const logsPerPatient = await Promise.all(
      patientIds.map(async (id) => {
        try {
          const logs = await getPatientMedicationLogs(id, range);
          return { id, logs: logs.slice(0, 20) };
        } catch (loadError) {
          console.error(`Failed to load medication logs for patient ${id}`, loadError);
          return { id, logs: [] as MedicationAdministrationDocument[] };
        }
      })
    );

    const metricsRecord: Record<string, PatientMetrics> = {};
    const activityItems: RecentActivityItem[] = [];

    logsPerPatient.forEach(({ id, logs }) => {
      let taken = 0;
      let missed = 0;

      logs.forEach((log) => {
        const status = getAdministrationStatus(log);
        if (status === 'missed') {
          missed += 1;
        } else {
          taken += 1;
        }

        const timestamp = (log.actualTime || log.effectiveDateTime) as Timestamp;
        activityItems.push({
          id: log.id,
          patientId: id,
          patientName: patientRecord[id]?.name?.[0]?.text ?? 'Patient',
          medicationName: log.medicationCodeableConcept?.text,
          status,
          performerName: log.performedByName,
          recordedAt: timestamp,
          scheduledTime: (log.scheduledTime as Timestamp | null) ?? null,
        });
      });

      metricsRecord[id] = {
        totalLogs: logs.length,
        taken,
        missed,
      };
    });

    activityItems.sort((a, b) => b.recordedAt.toMillis() - a.recordedAt.toMillis());

    activityItems.forEach((item) => {
      if (item.status !== 'missed') {
        return;
      }

      if (notifiedMissedRef.current.has(item.id)) {
        return;
      }

      notifiedMissedRef.current.add(item.id);
      const scheduledLabel = item.scheduledTime
        ? item.scheduledTime.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : item.recordedAt.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      void notifyCaregiverMissedDose(
        item.patientName,
        item.medicationName ?? 'Medication',
        scheduledLabel
      );
    });

    setPatientMetrics(metricsRecord);
    setRecentActivity(activityItems.slice(0, 12));
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setIsLoading(true);
      try {
        await loadDashboard();
        if (mounted) {
          setError(null);
        }
      } catch (loadError) {
        console.error('Failed to load caregiver dashboard', loadError);
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load caregiver data right now. Please try again.'
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
      setError(null);
    } catch (refreshError) {
      console.error('Failed to refresh caregiver dashboard', refreshError);
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Unable to refresh caregiver data right now. Please try again.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const setInviteActionLoading = (connectionId: string, active: boolean) => {
    setActionLoading((previous) => {
      if (!active) {
        const { [connectionId]: _removed, ...rest } = previous;
        return rest;
      }
      return { ...previous, [connectionId]: true };
    });
  };

  const handleAcceptInvite = async (connection: FamilyConnection) => {
    const patientName = renderPatientName(connection);
    setInviteActionLoading(connection.id, true);
    try {
      await acceptInvitation(connection.id);
      await loadDashboard();
      setError(null);
      void notifyCaregiverInvitationAccepted(patientName);
    } catch (acceptError) {
      console.error('Failed to accept caregiver invitation', acceptError);
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : 'Unable to accept this invitation right now.'
      );
    } finally {
      setInviteActionLoading(connection.id, false);
    }
  };

  const handleRejectInvite = async (connection: FamilyConnection) => {
    setInviteActionLoading(connection.id, true);
    try {
      await rejectInvitation(connection.id);
      await loadDashboard();
      setError(null);
    } catch (rejectError) {
      console.error('Failed to reject caregiver invitation', rejectError);
      setError(
        rejectError instanceof Error
          ? rejectError.message
          : 'Unable to reject this invitation right now.'
      );
    } finally {
      setInviteActionLoading(connection.id, false);
    }
  };

  const summary = useMemo(() => {
    const totalPatients = connections.length;
    const totalPending = pendingInvites.length;
    const totalMissed = Object.values(patientMetrics).reduce((acc, metric) => acc + metric.missed, 0);
    const totalTaken = Object.values(patientMetrics).reduce((acc, metric) => acc + metric.taken, 0);

    return {
      totalPatients,
      totalPending,
      totalMissed,
      totalTaken,
    };
  }, [connections.length, pendingInvites.length, patientMetrics]);

  const missedAlerts = useMemo(
    () => recentActivity.filter((item) => item.status === 'missed').slice(0, 5),
    [recentActivity]
  );

  const renderPatientName = (connection: FamilyConnection) =>
    patientMap[connection.patientId]?.name?.[0]?.text ?? connection.patientId;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
            Caregiver dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor patients you support, review pending invitations, and keep track of recent activity.
          </Typography>
        </Box>
        <Tooltip title="Refresh data">
          <span>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={isLoading || refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </span>
        </Tooltip>
      </Box>

      <NotificationBanner
        id="caregiver-error-banner"
        visible={Boolean(error)}
        severity="error"
        icon={<ErrorOutlineIcon fontSize="inherit" />}
      >
        {error}
      </NotificationBanner>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <Diversity3Icon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{summary.totalPatients}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active patients
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <PendingIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{summary.totalPending}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending invites
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'error.main' }}>
                      <WarningAmberIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{summary.totalMissed}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Missed doses (7 days)
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <CheckCircleIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{summary.totalTaken}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Logged doses (7 days)
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {connections.length === 0 && pendingInvites.length === 0 && (
            <Alert severity="info">
              You do not have any caregiver connections yet. Ask a patient to send you an invitation to get started.
            </Alert>
          )}

          {connections.length > 0 && (
            <Card variant="outlined">
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Diversity3Icon />
                  </Avatar>
                }
                title="Patients you care for"
                subheader="Summary for the last 7 days"
              />
              <CardContent>
                <List>
                  {connections.map((connection, index) => {
                    const metrics = patientMetrics[connection.patientId] ?? {
                      totalLogs: 0,
                      taken: 0,
                      missed: 0,
                    };
                    const patientName = renderPatientName(connection);
                    return (
                      <React.Fragment key={connection.id}>
                        <ListItem alignItems="flex-start">
                          <ListItemAvatar>
                            <Avatar>
                              <Diversity3Icon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={patientName}
                            secondary={
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Chip
                                  size="small"
                                  color="success"
                                  icon={<CheckCircleIcon />}
                                  label={`${metrics.taken} taken`}
                                />
                                <Chip
                                  size="small"
                                  color={metrics.missed > 0 ? 'warning' : 'default'}
                                  icon={<WarningAmberIcon />}
                                  label={`${metrics.missed} missed`}
                                />
                                <Chip
                                  size="small"
                                  icon={<AlarmOnIcon />}
                                  label={`${metrics.totalLogs} logs`}
                                />
                              </Stack>
                            }
                          />
                        </ListItem>
                        {index < connections.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          )}

          {pendingInvites.length > 0 && (
            <Card variant="outlined">
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <PendingIcon />
                  </Avatar>
                }
                title="Pending invitations"
                subheader="Respond to invitations sent by patients"
              />
              <CardContent>
                <List>
                  {pendingInvites.map((connection, index) => {
                    const loading = Boolean(actionLoading[connection.id]);
                    return (
                      <React.Fragment key={connection.id}>
                        <ListItem
                          secondaryAction={
                            <Stack direction="row" spacing={1}>
                              <Tooltip title="Accept invitation">
                                <span>
                                  <IconButton
                                    color="success"
                                    onClick={() => handleAcceptInvite(connection)}
                                    disabled={loading}
                                  >
                                    {loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Reject invitation">
                                <span>
                                  <IconButton
                                    color="error"
                                    onClick={() => handleRejectInvite(connection)}
                                    disabled={loading}
                                  >
                                    {loading ? <CircularProgress size={16} /> : <CancelIcon />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar>
                              <HourglassBottomIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={connection.patientId}
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                Invited {connection.invitedAt ? formatDistanceToNow(connection.invitedAt.toDate(), { addSuffix: true }) : 'recently'}
                              </Typography>
                            }
                          />
                        </ListItem>
                        {index < pendingInvites.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          )}

          {missedAlerts.length > 0 && (
            <Card variant="outlined">
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <WarningAmberIcon />
                  </Avatar>
                }
                title="Recent alerts"
                subheader="Most recent missed doses"
              />
              <CardContent>
                <List>
                  {missedAlerts.map((alert, index) => (
                    <React.Fragment key={alert.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <WarningAmberIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${alert.patientName} missed a dose${alert.medicationName ? ` of ${alert.medicationName}` : ''}`}
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {`Recorded ${formatDistanceToNow(alert.recordedAt.toDate(), { addSuffix: true })}`}
                              {alert.performerName ? ` • Logged by ${alert.performerName}` : ''}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < missedAlerts.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {recentActivity.length > 0 && (
            <Card variant="outlined">
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <AlarmOnIcon />
                  </Avatar>
                }
                title="Recent activity"
                subheader="Latest logged doses across your patients"
              />
              <CardContent>
                <List>
                  {recentActivity.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <AlarmOnIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${activity.patientName}${activity.medicationName ? ` • ${activity.medicationName}` : ''}`}
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {`${activity.status === 'missed' ? 'Missed' : 'Logged'} ${formatDistanceToNow(activity.recordedAt.toDate(), { addSuffix: true })}`}
                              {activity.performerName ? ` by ${activity.performerName}` : ''}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < recentActivity.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default CaregiverDashboard;
