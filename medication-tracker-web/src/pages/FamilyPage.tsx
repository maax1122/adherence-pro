
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
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  FamilyRestroom as FamilyRestroomIcon,
  GroupAdd as GroupAddIcon,
  ManageAccounts as ManageAccountsIcon,
  Pending as PendingIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import NotificationBanner from '@/components/NotificationBanner';
import { useLayoutContext } from '@/components/Layout';
import {
  acceptInvitation,
  createInvitation,
  getPatientConnections,
  rejectInvitation,
  revokeConnection,
  updatePermissions,
} from '@/services/firestore/familyConnectionService';
import type { FamilyConnection } from '@/types/fhir';

type PermissionKey = 'view_only' | 'can_log';

const DEFAULT_PERMISSIONS: PermissionKey[] = ['view_only'];

const FamilyPage: React.FC = () => {
  const { selectedPatient, selectedPatientId, isLoadingPatients, currentUser } = useLayoutContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<FamilyConnection[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermissions, setInvitePermissions] = useState<PermissionKey[]>(DEFAULT_PERMISSIONS);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const loadConnections = useCallback(async () => {
    if (!selectedPatientId) {
      setConnections([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await getPatientConnections(selectedPatientId);
      setConnections(results);
    } catch (loadError) {
      console.error('Failed to load family connections', loadError);
      setConnections([]);
      setError('Unable to load caregiver data right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const pendingConnections = useMemo(
    () => connections.filter((connection) => connection.status === 'pending'),
    [connections]
  );

  const activeConnections = useMemo(
    () => connections.filter((connection) => connection.status === 'accepted'),
    [connections]
  );

  const revokeableConnections = useMemo(
    () => new Set(activeConnections.map((connection) => connection.id)),
    [activeConnections]
  );

  const toggleInvitePermission = (permission: PermissionKey) => {
    setInvitePermissions((previous) => {
      if (previous.includes(permission)) {
        if (permission === 'view_only') {
          return previous.includes('can_log') ? ['can_log'] : ['view_only'];
        }
        return previous.filter((item) => item !== permission);
      }

      if (permission === 'can_log' && !previous.includes('view_only')) {
        return [...previous, permission, 'view_only'];
      }

      return [...previous, permission];
    });
  };

  const handleOpenInviteDialog = () => {
    setInviteDialogOpen(true);
  };

  const resetInviteForm = () => {
    setInviteEmail('');
    setInvitePermissions(DEFAULT_PERMISSIONS);
  };

  const handleCloseInviteDialog = () => {
    if (!inviteSubmitting) {
      setInviteDialogOpen(false);
      resetInviteForm();
    }
  };

  const handleInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPatientId) {
      return;
    }

    const permissions = Array.from(new Set<PermissionKey>(invitePermissions));
    if (permissions.length === 0) {
      setError('At least one permission must be selected when inviting a caregiver.');
      return;
    }

    setInviteSubmitting(true);
    setError(null);

    try {
      await createInvitation({
        patientId: selectedPatientId,
        caregiverEmail: inviteEmail.trim(),
        permissions,
      });
      setInviteDialogOpen(false);
      resetInviteForm();
      await loadConnections();
    } catch (inviteError) {
      console.error('Failed to invite caregiver', inviteError);
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : 'Unable to send invitation. Please verify the email and try again.'
      );
    } finally {
      setInviteSubmitting(false);
    }
  };

  const setConnectionLoading = (connectionId: string, active: boolean) => {
    setActionLoading((previous) => {
      if (!active) {
        const { [connectionId]: _removed, ...rest } = previous;
        return rest;
      }
      return { ...previous, [connectionId]: true };
    });
  };

  const handleRevoke = async (connection: FamilyConnection) => {
    setConnectionLoading(connection.id, true);
    setError(null);
    try {
      await revokeConnection(connection.id);
      await loadConnections();
    } catch (revokeError) {
      console.error('Failed to revoke connection', revokeError);
      setError('Could not revoke caregiver access. Please try again.');
    } finally {
      setConnectionLoading(connection.id, false);
    }
  };

  const handlePermissionChange = async (
    connection: FamilyConnection,
    permission: PermissionKey,
    checked: boolean
  ) => {
    const updated = new Set(connection.permissions);

    if (checked) {
      updated.add(permission);
      if (permission === 'can_log') {
        updated.add('view_only');
      }
    } else {
      updated.delete(permission);
      if (permission === 'view_only' && updated.has('can_log')) {
        updated.delete('can_log');
      }
    }

    if (updated.size === 0) {
      setError('At least one permission must remain for each caregiver.');
      return;
    }

    const permissions = Array.from(updated);
    setConnectionLoading(connection.id, true);
    setError(null);

    try {
      await updatePermissions(connection.id, { permissions });
      await loadConnections();
    } catch (permissionError) {
      console.error('Failed to update permissions', permissionError);
      setError('Could not update caregiver permissions. Please try again.');
    } finally {
      setConnectionLoading(connection.id, false);
    }
  };

  const handleAcceptInvitation = async (connection: FamilyConnection) => {
    setConnectionLoading(connection.id, true);
    setError(null);

    try {
      await acceptInvitation(connection.id);
      await loadConnections();
    } catch (acceptError) {
      console.error('Failed to accept invitation', acceptError);
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : 'Unable to accept this invitation right now.'
      );
    } finally {
      setConnectionLoading(connection.id, false);
    }
  };

  const handleRejectInvitation = async (connection: FamilyConnection) => {
    setConnectionLoading(connection.id, true);
    setError(null);

    try {
      await rejectInvitation(connection.id);
      await loadConnections();
    } catch (rejectError) {
      console.error('Failed to reject invitation', rejectError);
      setError(
        rejectError instanceof Error
          ? rejectError.message
          : 'Unable to reject this invitation right now.'
      );
    } finally {
      setConnectionLoading(connection.id, false);
    }
  };

  const canCurrentUserActOnInvitation = (connection: FamilyConnection): boolean => {
    if (connection.status !== 'pending') {
      return false;
    }

    const userEmail = currentUser?.email?.toLowerCase();
    return Boolean(userEmail && userEmail === connection.caregiverEmail.toLowerCase());
  };

  const disableActions = !selectedPatientId || isLoading || isLoadingPatients;

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
            Caregiver access
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {selectedPatient
              ? `Manage caregivers for ${selectedPatient.name?.[0]?.text ?? 'this profile'}.`
              : 'Select a profile to manage caregiver invitations and permissions.'}
          </Typography>
        </Box>
        <Tooltip title={selectedPatientId ? 'Invite a caregiver' : 'Select a profile first'}>
          <span>
            <Button
              variant="contained"
              startIcon={<GroupAddIcon />}
              onClick={handleOpenInviteDialog}
              disabled={!selectedPatientId || isLoadingPatients}
            >
              Invite caregiver
            </Button>
          </span>
        </Tooltip>
      </Box>

      <NotificationBanner
        id="family-error-banner"
        visible={Boolean(error)}
        severity="error"
        icon={<SecurityIcon fontSize="inherit" />}
      >
        {error}
      </NotificationBanner>

      <NotificationBanner
        id="family-no-patient-banner"
        visible={!isLoadingPatients && !selectedPatientId}
        severity="info"
        icon={<FamilyRestroomIcon fontSize="inherit" />}
      >
        Choose a profile to review caregiver invitations and access rights.
      </NotificationBanner>

      {(isLoadingPatients || isLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && selectedPatientId && connections.length === 0 && (
        <Alert severity="info">
          No caregivers yet. Invite someone to help manage adherence for this profile.
        </Alert>
      )}

      {activeConnections.length > 0 && (
        <Card variant="outlined">
          <CardHeader
            avatar={
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <ManageAccountsIcon />
              </Avatar>
            }
            title="Active caregivers"
            subheader="Update permissions or revoke access"
          />
          <CardContent>
            <List>
              {activeConnections.map((connection, index) => {
                const loading = Boolean(actionLoading[connection.id]);
                return (
                  <React.Fragment key={connection.id}>
                    <ListItem
                      alignItems="flex-start"
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Revoke access">
                            <span>
                              <IconButton
                                color="error"
                                onClick={() => handleRevoke(connection)}
                                disabled={loading || !revokeableConnections.has(connection.id)}
                              >
                                {loading ? <CircularProgress size={16} /> : <DeleteIcon />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={connection.caregiverEmail}
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                              {connection.acceptedAt
                                ? `Connected ${formatDistanceToNow(connection.acceptedAt.toDate(), {
                                    addSuffix: true,
                                  })}`
                                : 'Connection active'}
                            </Typography>
                            <FormControl component="fieldset" variant="standard">
                              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Permissions
                              </Typography>
                              <FormGroup row>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={connection.permissions.includes('view_only')}
                                      onChange={(event) =>
                                        handlePermissionChange(connection, 'view_only', event.target.checked)
                                      }
                                      disabled={loading}
                                    />
                                  }
                                  label="View records"
                                />
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={connection.permissions.includes('can_log')}
                                      onChange={(event) =>
                                        handlePermissionChange(connection, 'can_log', event.target.checked)
                                      }
                                      disabled={loading}
                                    />
                                  }
                                  label="Log medications"
                                />
                              </FormGroup>
                            </FormControl>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < activeConnections.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}

      {pendingConnections.length > 0 && (
        <Card variant="outlined">
          <CardHeader
            avatar={
              <Avatar sx={{ bgcolor: 'warning.main' }}>
                <PendingIcon />
              </Avatar>
            }
            title="Pending invitations"
            subheader="Awaiting caregiver response"
          />
          <CardContent>
            <List>
              {pendingConnections.map((connection, index) => {
                const loading = Boolean(actionLoading[connection.id]);
                const canAct = canCurrentUserActOnInvitation(connection);
                return (
                  <React.Fragment key={connection.id}>
                    <ListItem
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          <Tooltip
                            title={
                              canAct
                                ? 'Accept invitation'
                                : 'Caregiver must accept via email link'
                            }
                          >
                            <span>
                              <IconButton
                                color="success"
                                onClick={() => handleAcceptInvitation(connection)}
                                disabled={loading || !canAct || disableActions}
                              >
                                {loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip
                            title={
                              canAct
                                ? 'Reject invitation'
                                : 'Caregiver must reject via email link'
                            }
                          >
                            <span>
                              <IconButton
                                color="error"
                                onClick={() => handleRejectInvitation(connection)}
                                disabled={loading || !canAct || disableActions}
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
                          <EmailIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={connection.caregiverEmail}
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {connection.invitedAt
                              ? `Invited ${formatDistanceToNow(connection.invitedAt.toDate(), {
                                  addSuffix: true,
                                })}`
                              : 'Pending'}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < pendingConnections.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                );
              })}
            </List>
          </CardContent>
          <CardActions sx={{ justifyContent: 'flex-end', px: 3, pb: 2 }}>
            <Tooltip title="Refresh invitations">
              <span>
                <Button
                  variant="text"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    void loadConnections();
                  }}
                  disabled={disableActions}
                >
                  Refresh
                </Button>
              </span>
            </Tooltip>
          </CardActions>
        </Card>
      )}

      {connections.some((connection) => connection.status === 'revoked' || connection.status === 'rejected') && (
        <Card variant="outlined">
          <CardHeader
            avatar={
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                <SecurityIcon />
              </Avatar>
            }
            title="Closed connections"
            subheader="Audit trail of revoked or rejected caregivers"
          />
          <CardContent>
            <List>
              {connections
                .filter((connection) => connection.status === 'revoked' || connection.status === 'rejected')
                .map((connection, index, array) => (
                  <React.Fragment key={connection.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={connection.caregiverEmail}
                        secondary={
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip
                              size="small"
                              color={connection.status === 'revoked' ? 'warning' : 'default'}
                              label={connection.status === 'revoked' ? 'Revoked' : 'Rejected'}
                            />
                            {connection.revokedAt && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`Revoked ${formatDistanceToNow(connection.revokedAt.toDate(), {
                                  addSuffix: true,
                                })}`}
                              />
                            )}
                            {connection.rejectedAt && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`Rejected ${formatDistanceToNow(connection.rejectedAt.toDate(), {
                                  addSuffix: true,
                                })}`}
                              />
                            )}
                          </Stack>
                        }
                      />
                    </ListItem>
                    {index < array.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Dialog open={inviteDialogOpen} onClose={handleCloseInviteDialog} fullWidth maxWidth="sm">
        <form onSubmit={handleInviteSubmit}>
          <DialogTitle>Invite caregiver</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}>
            <TextField
              autoFocus
              label="Caregiver email"
              type="email"
              fullWidth
              value={inviteEmail}
              required
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="caregiver@example.com"
            />
            <FormControl component="fieldset" variant="standard">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Permissions
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={invitePermissions.includes('view_only')}
                      onChange={() => toggleInvitePermission('view_only')}
                    />
                  }
                  label="View medication history"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={invitePermissions.includes('can_log')}
                      onChange={() => toggleInvitePermission('can_log')}
                    />
                  }
                  label="Log medications on behalf of patient"
                />
              </FormGroup>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseInviteDialog} disabled={inviteSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<EmailIcon />}
              disabled={inviteSubmitting}
            >
              {inviteSubmitting ? <CircularProgress size={16} /> : 'Send invitation'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default FamilyPage;
