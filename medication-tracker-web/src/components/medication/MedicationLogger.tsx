import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import type { MedicationRequestDocument } from '@/types/fhir';
import {
  logMedication,
  type LogMedicationData,
} from '@/services/firestore/medicationAdministrationService';
import {
  markReminderCompleted,
  markReminderMissed,
} from '@/services/reminders/reminderService';

export type MedicationLoggerStatus = 'completed' | 'not-done';

export interface MedicationLoggerProps {
  open: boolean;
  medication: MedicationRequestDocument | null;
  defaultStatus?: MedicationLoggerStatus;
  reminderContext?: {
    scheduleId: string;
    instanceId: string;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const STATUS_OPTIONS: Array<{ value: MedicationLoggerStatus; label: string }> = [
  { value: 'completed', label: 'Taken' },
  { value: 'not-done', label: 'Missed' },
];

const formatDateInputValue = (date: Date): string => format(date, "yyyy-MM-dd'T'HH:mm");

const parseDateInputValue = (value: string): Date => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const MedicationLogger: React.FC<MedicationLoggerProps> = ({
  open,
  medication,
  defaultStatus = 'completed',
  reminderContext,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<MedicationLoggerStatus>(defaultStatus);
  const [dateTime, setDateTime] = useState<string>(formatDateInputValue(new Date()));
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setStatus(defaultStatus);
    setDateTime(formatDateInputValue(new Date()));
    setNote('');
    setReason('');
    setErrorMessage(null);
  }, [open, defaultStatus, medication?.id]);

  const medicationName = medication?.medicationName ?? 'Medication';

  const canSubmit = useMemo(() => Boolean(medication), [medication]);

  const buildPayload = useCallback((): LogMedicationData | null => {
    if (!medication) {
      return null;
    }

    const effectiveDate = parseDateInputValue(dateTime);

    return {
      medicationRequestId: medication.id,
      status,
      effectiveDateTime: effectiveDate,
      reminderInstanceId: reminderContext?.instanceId,
      note: note.trim() || undefined,
      performerRole: 'patient',
    };
  }, [medication, dateTime, status, note, reminderContext?.instanceId]);

  const handleSubmit = useCallback(
    async (overrideStatus?: MedicationLoggerStatus) => {
      if (!canSubmit) {
        return;
      }

      const desiredStatus = overrideStatus ?? status;
      const payload = buildPayload();
      if (!payload) {
        return;
      }

      payload.status = desiredStatus;
      if (desiredStatus === 'not-done' && reason.trim()) {
        payload.reasonCode = reason.trim();
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const result = await logMedication(payload);

        if (reminderContext) {
          if (desiredStatus === 'completed') {
            await markReminderCompleted(
              reminderContext.scheduleId,
              reminderContext.instanceId,
              result.id
            );
          } else {
            await markReminderMissed(reminderContext.scheduleId, reminderContext.instanceId);
          }
        }

        await onSuccess?.();
        onClose();
      } catch (error) {
        console.error('Failed to log medication', error);
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to log medication right now.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [buildPayload, canSubmit, onClose, onSuccess, reason, reminderContext, status]
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Log medication</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            {medicationName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Record whether this dose was taken or missed.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
          <Button
            variant="contained"
            color="success"
            onClick={() => handleSubmit('completed')}
            disabled={isSubmitting || !canSubmit}
          >
            Mark taken now
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => handleSubmit('not-done')}
            disabled={isSubmitting || !canSubmit}
          >
            Mark missed
          </Button>
        </Stack>

        <ToggleButtonGroup
          value={status}
          exclusive
          onChange={(_event, value) => {
            if (value) {
              setStatus(value);
            }
          }}
          size="small"
          aria-label="Medication status"
        >
          {STATUS_OPTIONS.map((option) => (
            <ToggleButton key={option.value} value={option.value} aria-label={option.label}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <TextField
          label="Logged time"
          type="datetime-local"
          value={dateTime}
          onChange={(event) => setDateTime(event.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />

        {status === 'not-done' && (
          <TextField
            label="Reason"
            placeholder="Forgot, side effects, etc."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            fullWidth
          />
        )}

        <TextField
          label="Notes"
          placeholder="Optional notes"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          fullWidth
          multiline
          minRows={2}
        />

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => handleSubmit()}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? 'Saving…' : 'Save log'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { MedicationLogger };

export default MedicationLogger;
