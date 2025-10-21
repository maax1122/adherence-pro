import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Email as EmailIcon,
  GroupAdd as GroupAddIcon,
} from '@mui/icons-material';
import { createInvitation } from '@/services/firestore/familyConnectionService';
import { notifyCaregiverInvitationSent } from '@/services/notifications/notificationService';

type PermissionKey = 'view_only' | 'can_log';

const DEFAULT_PERMISSIONS: PermissionKey[] = ['view_only'];

export interface CaregiverInviteFormValues {
  email: string;
  permissions: PermissionKey[];
}

export interface CaregiverInviteProps {
  patientId?: string | null;
  patientName?: string;
  disabled?: boolean;
  onInvitationSent?: (values: CaregiverInviteFormValues) => void | Promise<void>;
  onError?: (message: string | null) => void;
}

const CaregiverInvite: React.FC<CaregiverInviteProps> = ({
  patientId,
  patientName,
  disabled,
  onInvitationSent,
  onError,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<PermissionKey[]>(DEFAULT_PERMISSIONS);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!email.trim()) {
      return false;
    }
    return permissions.length > 0;
  }, [email, permissions]);

  const togglePermission = useCallback((permission: PermissionKey) => {
    setPermissions((previous) => {
      if (previous.includes(permission)) {
        if (permission === 'view_only') {
          return previous.includes('can_log') ? ['can_log'] : [];
        }
        return previous.filter((item) => item !== permission);
      }

      if (permission === 'can_log' && !previous.includes('view_only')) {
        return [...previous, permission, 'view_only'];
      }

      return [...previous, permission];
    });
  }, []);

  const handleOpenDialog = () => {
    if (!patientId || disabled) {
      return;
    }
    setErrorMessage(null);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEmail('');
    setPermissions(DEFAULT_PERMISSIONS);
    setErrorMessage(null);
  };

  const handleCloseDialog = () => {
    if (submitting) {
      return;
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!patientId || !canSubmit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    onError?.(null);

    const trimmedEmail = email.trim();
    const permissionsPayload = Array.from(new Set<PermissionKey>(permissions));

    try {
      await createInvitation({
        patientId,
        caregiverEmail: trimmedEmail,
        permissions: permissionsPayload,
      });

      void notifyCaregiverInvitationSent(trimmedEmail, patientName);

      setStatusMessage(`Invitation sent to ${trimmedEmail}`);
      setDialogOpen(false);
      resetForm();
      await onInvitationSent?.({ email: trimmedEmail, permissions: permissionsPayload });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to send invitation. Please verify the email and try again.';
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
      {statusMessage && (
        <Alert
          severity="success"
          onClose={() => setStatusMessage(null)}
          sx={{ width: '100%' }}
        >
          {statusMessage}
        </Alert>
      )}
      <Tooltip title={patientId ? 'Invite a caregiver' : 'Select a profile first'}>
        <span>
          <Button
            variant="contained"
            startIcon={<GroupAddIcon />}
            onClick={handleOpenDialog}
            disabled={!patientId || disabled}
          >
            Invite caregiver
          </Button>
        </span>
      </Tooltip>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit} noValidate>
          <DialogTitle>Invite caregiver</DialogTitle>
          <DialogContent
            dividers
            sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}
          >
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                {patientName ? `Grant access to ${patientName}` : 'Grant access to this profile'}
              </Typography>
            </Box>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <TextField
              autoFocus
              label="Caregiver email"
              type="email"
              fullWidth
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="caregiver@example.com"
              required
            />
            <FormControl component="fieldset" variant="standard">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Permissions
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={permissions.includes('view_only')}
                      onChange={() => togglePermission('view_only')}
                      disabled={submitting}
                    />
                  }
                  label="View medication history"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={permissions.includes('can_log')}
                      onChange={() => togglePermission('can_log')}
                      disabled={submitting}
                    />
                  }
                  label="Log medications on behalf of patient"
                />
              </FormGroup>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Caregivers with logging permission can also mark medications as taken or missed.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<EmailIcon />}
              disabled={submitting || !canSubmit}
            >
              {submitting ? 'Sending…' : 'Send invitation'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default CaregiverInvite;
