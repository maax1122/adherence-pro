import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';

export interface ReminderNotificationProps {
  medicationName: string;
  patientName?: string;
  scheduledTime: Date;
  isProcessing?: boolean;
  onLogTaken: () => void;
  onMarkMissed: () => void;
  onSnooze?: (minutes: number) => void;
  errorMessage?: string | null;
}

const ReminderNotification: React.FC<ReminderNotificationProps> = ({
  medicationName,
  patientName,
  scheduledTime,
  isProcessing = false,
  onLogTaken,
  onMarkMissed,
  onSnooze,
  errorMessage,
}) => {
  const formattedTime = format(scheduledTime, 'PPpp');

  return (
    <Card variant="outlined" sx={{ borderColor: 'primary.light' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="overline" color="primary">
          Upcoming reminder
        </Typography>
        <Typography variant="h6">{medicationName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {patientName ? `${patientName} • ${formattedTime}` : formattedTime}
        </Typography>
        <Divider flexItem sx={{ my: 1 }} />
        <Typography variant="body2">
          Log this dose now or snooze the reminder if you need more time.
        </Typography>
        {errorMessage && <Alert severity="error" sx={{ mt: 1 }}>{errorMessage}</Alert>}
      </CardContent>
      <CardActions sx={{ px: 3, pb: 3, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
          <Button
            variant="contained"
            color="success"
            onClick={onLogTaken}
            disabled={isProcessing}
          >
            Log taken
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={onMarkMissed}
            disabled={isProcessing}
          >
            Mark missed
          </Button>
        </Stack>
        {onSnooze && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Snooze
            </Typography>
            <Stack direction="row" spacing={1}>
              {[5, 10, 30].map((minutes) => (
                <Button
                  key={minutes}
                  size="small"
                  onClick={() => onSnooze(minutes)}
                  disabled={isProcessing}
                >
                  {minutes} min
                </Button>
              ))}
            </Stack>
          </Box>
        )}
      </CardActions>
    </Card>
  );
};

export default ReminderNotification;
