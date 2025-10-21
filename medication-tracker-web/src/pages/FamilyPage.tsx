
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
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  FamilyRestroom as FamilyRestroomIcon,
  ManageAccounts as ManageAccountsIcon,
  Pending as PendingIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import NotificationBanner from '@/components/NotificationBanner';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import PatientCard from '@/components/patient/PatientCard';
import { PatientForm, PatientFormValues } from '@/components/patient/PatientForm';
import CaregiverInvite from '@/components/family/CaregiverInvite';
import {
  acceptInvitation,
  getPatientConnections,
  rejectInvitation,
  revokeConnection,
  updatePermissions,
} from '@/services/firestore/familyConnectionService';
import type { FamilyConnection, PatientDocument } from '@/types/fhir';

type PermissionKey = 'view_only' | 'can_log';

const RELATIONSHIP_VALUES: PatientFormValues['relationship'][] = [
  'self',
  'parent',
  'child',
  'spouse',
  'sibling',
  'grandparent',
  'grandchild',
  'other',
];

const GENDER_VALUES: PatientFormValues['gender'][] = ['female', 'male', 'other', 'unknown'];

const FamilyPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    profiles,
    activeProfile,
    activeProfileId,
    isLoading: isLoadingProfiles,
    error: profileError,
    isCreating,
    pendingProfileIds,
    createProfile,
    updateProfile,
    deleteProfile,
    refreshProfiles,
    selectProfile,
  } = useProfileContext();
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [connections, setConnections] = useState<FamilyConnection[]>([]);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const mapProfileToFormValues = useCallback(
    (profile: PatientDocument): PatientFormValues => {
      const relationship = RELATIONSHIP_VALUES.includes(profile.relationship as any)
        ? (profile.relationship as PatientFormValues['relationship'])
        : 'other';
      const gender = GENDER_VALUES.includes(profile.gender as any)
        ? (profile.gender as PatientFormValues['gender'])
        : 'unknown';

      return {
        name: profile.name?.[0]?.text ?? '',
        birthDate: profile.birthDate ?? undefined,
        relationship,
        gender,
        photoUrl: profile.photo?.[0]?.url,
      };
    },
    []
  );

  const handleRefreshProfiles = useCallback(async () => {
    try {
      await refreshProfiles();
    } catch (refreshError) {
      console.error('Failed to refresh profiles', refreshError);
    }
  }, [refreshProfiles]);

  const handleOpenCreateProfile = () => {
    setProfileDialogMode('create');
    setProfileDialogProfileId(null);
    setProfileDialogInitialValues({
      name: '',
      relationship: profiles.length === 0 ? 'self' : 'other',
      gender: 'unknown',
    });
    setProfileDialogError(null);
    setProfileDialogOpen(true);
  };

  const handleOpenEditProfile = (profile: PatientDocument) => {
    setProfileDialogMode('edit');
    setProfileDialogProfileId(profile.id);
    setProfileDialogInitialValues(mapProfileToFormValues(profile));
    setProfileDialogError(null);
    setProfileDialogOpen(true);
  };

  const handleCloseProfileDialog = () => {
    if (profileDialogOpen) {
      const pendingState = profileDialogProfileId
        ? pendingProfileIds[profileDialogProfileId]
        : undefined;
      if (isCreating || pendingState === 'updating') {
        return;
      }
    }
    setProfileDialogOpen(false);
    setProfileDialogError(null);
  };

  const handleSubmitProfileDialog = async (values: PatientFormValues) => {
    setProfileDialogError(null);
    const payload = {
      name: values.name.trim(),
      birthDate: values.birthDate || undefined,
      relationship: values.relationship,
      gender: values.gender,
      photoUrl: values.photoUrl || undefined,
    };

    try {
      if (profileDialogMode === 'create') {
        await createProfile(payload);
      } else if (profileDialogProfileId) {
        await updateProfile(profileDialogProfileId, payload);
      }
      await refreshProfiles();
      setProfileDialogOpen(false);
    } catch (profileMutationError) {
      console.error('Failed to save profile', profileMutationError);
      setProfileDialogError(
        profileMutationError instanceof Error
          ? profileMutationError.message
          : 'Unable to save profile. Please try again.'
      );
    }
  };

  const handlePromptDeleteProfile = (profile: PatientDocument) => {
    setDeleteDialogProfileId(profile.id);
    setDeleteDialogError(null);
    setDeleteDialogLoading(false);
  };

  const handleCloseDeleteDialog = () => {
    if (deleteDialogLoading) {
      return;
    }
    setDeleteDialogProfileId(null);
    setDeleteDialogError(null);
  };

  const handleConfirmDeleteProfile = async () => {
    if (!deleteDialogProfileId) {
      return;
    }

    setDeleteDialogLoading(true);
    setDeleteDialogError(null);
    try {
      await deleteProfile(deleteDialogProfileId);
      await refreshProfiles();
      setDeleteDialogProfileId(null);
    } catch (deleteProfileError) {
      console.error('Failed to delete profile', deleteProfileError);
      setDeleteDialogError(
        deleteProfileError instanceof Error
          ? deleteProfileError.message
          : 'Unable to remove this profile right now.'
      );
    } finally {
      setDeleteDialogLoading(false);
    }
  };

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileDialogMode, setProfileDialogMode] = useState<'create' | 'edit'>('create');
  const [profileDialogInitialValues, setProfileDialogInitialValues] =
    useState<PatientFormValues | undefined>(undefined);
  const [profileDialogProfileId, setProfileDialogProfileId] = useState<string | null>(null);
  const [profileDialogError, setProfileDialogError] = useState<string | null>(null);
  const [deleteDialogProfileId, setDeleteDialogProfileId] = useState<string | null>(null);
  const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null);
  const [deleteDialogLoading, setDeleteDialogLoading] = useState(false);

  const loadConnections = useCallback(async () => {
    if (!activeProfileId) {
      setConnections([]);
      return;
    }

    setIsLoadingConnections(true);
    setConnectionsError(null);

    try {
      const results = await getPatientConnections(activeProfileId);
      setConnections(results);
    } catch (loadError) {
      console.error('Failed to load family connections', loadError);
      setConnections([]);
      setConnectionsError('Unable to load caregiver data right now. Please try again.');
    } finally {
      setIsLoadingConnections(false);
    }
  }, [activeProfileId]);

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
    setConnectionsError(null);
    try {
      await revokeConnection(connection.id);
      await loadConnections();
    } catch (revokeError) {
      console.error('Failed to revoke connection', revokeError);
      setConnectionsError('Could not revoke caregiver access. Please try again.');
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
      setConnectionsError('At least one permission must remain for each caregiver.');
      return;
    }

    const permissions = Array.from(updated);
    setConnectionLoading(connection.id, true);
    setConnectionsError(null);

    try {
      await updatePermissions(connection.id, { permissions });
      await loadConnections();
    } catch (permissionError) {
      console.error('Failed to update permissions', permissionError);
      setConnectionsError('Could not update caregiver permissions. Please try again.');
    } finally {
      setConnectionLoading(connection.id, false);
    }
  };

  const handleAcceptInvitation = async (connection: FamilyConnection) => {
    setConnectionLoading(connection.id, true);
    setConnectionsError(null);

    try {
      await acceptInvitation(connection.id);
      await loadConnections();
    } catch (acceptError) {
      console.error('Failed to accept invitation', acceptError);
      setConnectionsError(
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
    setConnectionsError(null);

    try {
      await rejectInvitation(connection.id);
      await loadConnections();
    } catch (rejectError) {
      console.error('Failed to reject invitation', rejectError);
      setConnectionsError(
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

  const profileDialogPendingState = profileDialogProfileId
    ? pendingProfileIds[profileDialogProfileId]
    : undefined;
  const isProfileDialogSubmitting =
    profileDialogMode === 'create' ? isCreating : profileDialogPendingState === 'updating';

  const disableActions = !activeProfileId || isLoadingConnections || isLoadingProfiles;

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
            Family profiles
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage family members and switch between profiles to review adherence data.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshProfiles}
            disabled={isLoadingProfiles}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleOpenCreateProfile}
            disabled={isCreating}
          >
            Add profile
          </Button>
        </Stack>
      </Box>

      <NotificationBanner
        id="family-profile-error"
        visible={Boolean(profileError)}
        severity="error"
        icon={<FamilyRestroomIcon fontSize="inherit" />}
      >
        {profileError}
      </NotificationBanner>

      <Grid container spacing={2}>
        {profiles.map((profile) => {
          const pendingState = pendingProfileIds[profile.id];
          const isUpdating = pendingState === 'updating';
          const isDeleting = pendingState === 'deleting';
          const isBusy = isUpdating || isDeleting;

          return (
            <Grid item xs={12} sm={6} md={4} key={profile.id}>
              <Box sx={{ position: 'relative' }}>
                <PatientCard
                  patient={profile}
                  selected={profile.id === activeProfileId}
                  onSelect={(patient) => selectProfile(patient.id)}
                  actions={
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        onClick={() => selectProfile(profile.id)}
                        disabled={isDeleting}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        startIcon={<EditIcon fontSize="small" />}
                        onClick={() => handleOpenEditProfile(profile)}
                        disabled={isBusy}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handlePromptDeleteProfile(profile)}
                        disabled={isDeleting || profiles.length <= 1}
                      >
                        Remove
                      </Button>
                    </Stack>
                  }
                />
                {isBusy && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(255,255,255,0.6)',
                      borderRadius: 2,
                    }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                )}
              </Box>
            </Grid>
          );
        })}
        {profiles.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info">Add your first profile to start coordinating family medications.</Alert>
          </Grid>
        )}
      </Grid>

      <Divider sx={{ my: 2 }} />
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
            {activeProfile
              ? `Manage caregivers for ${activeProfile.name?.[0]?.text ?? 'this profile'}.`
              : 'Select a profile to manage caregiver invitations and permissions.'}
          </Typography>
        </Box>
        <CaregiverInvite
          patientId={activeProfileId}
          patientName={activeProfile?.name?.[0]?.text}
          disabled={isLoadingProfiles}
          onInvitationSent={async () => {
            await loadConnections();
            setConnectionsError(null);
          }}
          onError={setConnectionsError}
        />
      </Box>

      <NotificationBanner
        id="family-error-banner"
        visible={Boolean(connectionsError)}
        severity="error"
        icon={<SecurityIcon fontSize="inherit" />}
      >
        {connectionsError}
      </NotificationBanner>

      <NotificationBanner
        id="family-no-patient-banner"
        visible={!isLoadingProfiles && !activeProfileId}
        severity="info"
        icon={<FamilyRestroomIcon fontSize="inherit" />}
      >
        Choose a profile to review caregiver invitations and access rights.
      </NotificationBanner>

      {(isLoadingProfiles || isLoadingConnections) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoadingConnections && activeProfileId && connections.length === 0 && (
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

      <Dialog open={profileDialogOpen} onClose={handleCloseProfileDialog} fullWidth maxWidth="sm">
        <DialogTitle>{profileDialogMode === 'create' ? 'Add profile' : 'Edit profile'}</DialogTitle>
        <DialogContent dividers sx={{ pt: 3 }}>
          <PatientForm
            onSubmit={handleSubmitProfileDialog}
            onCancel={handleCloseProfileDialog}
            submitting={isProfileDialogSubmitting}
            errorMessage={profileDialogError}
            initialValues={profileDialogInitialValues}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteDialogProfileId)} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Remove profile</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1">
            Removing this profile will stop reminders and caregiver access for that family member.
          </Typography>
          {deleteDialogError && (
            <Alert severity="error">{deleteDialogError}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleteDialogLoading}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDeleteProfile}
            disabled={deleteDialogLoading}
            startIcon={deleteDialogLoading ? <CircularProgress size={16} /> : undefined}
          >
            {deleteDialogLoading ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default FamilyPage;
