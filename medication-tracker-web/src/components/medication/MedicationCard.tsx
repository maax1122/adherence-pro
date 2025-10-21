import React from 'react';
import {
  Avatar,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Medication as MedicationIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import type { MedicationRequestDocument } from '@/types/fhir';

const getMedicationInitial = (medication: MedicationRequestDocument): string => {
  const name = medication.medicationName?.trim();
  if (name) {
    return name.charAt(0).toUpperCase();
  }
  return 'M';
};

const statusBadge = (status: MedicationRequestDocument['status']) => {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        color: 'success' as const,
        icon: <CheckCircleIcon fontSize="small" />,
      };
    case 'completed':
      return {
        label: 'Completed',
        color: 'primary' as const,
        icon: <CheckCircleIcon fontSize="small" />,
      };
    case 'on-hold':
      return {
        label: 'On hold',
        color: 'warning' as const,
        icon: <ScheduleIcon fontSize="small" />,
      };
    case 'stopped':
    case 'cancelled':
      return {
        label: 'Inactive',
        color: 'default' as const,
        icon: <ScheduleIcon fontSize="small" />,
      };
    default:
      return {
        label: status,
        color: 'info' as const,
        icon: <MedicationIcon fontSize="small" />,
      };
  }
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
      const date = new Date();
      date.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0);
      return Number.isNaN(date.getTime()) ? time : format(date, 'p');
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

export interface MedicationCardProps {
  medication: MedicationRequestDocument;
  onLogDose?: (medication: MedicationRequestDocument) => void;
  onEdit?: (medication: MedicationRequestDocument) => void;
  onMarkCompleted?: (medication: MedicationRequestDocument) => void;
  onDelete?: (medication: MedicationRequestDocument) => void;
  onOpenDetail?: (medication: MedicationRequestDocument) => void;
  isProcessing?: boolean;
  disableActions?: boolean;
}

export const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  onLogDose,
  onEdit,
  onMarkCompleted,
  onDelete,
  onOpenDetail,
  isProcessing = false,
  disableActions = false,
}) => {
  const badge = statusBadge(medication.status);
  const dosage = formatDosage(medication);
  const frequency = formatFrequency(medication);

  const handleCardClick = () => {
    if (onOpenDetail) {
      onOpenDetail(medication);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        cursor: onOpenDetail ? 'pointer' : 'default',
        transition: (theme) =>
          theme.transitions.create('box-shadow', { duration: theme.transitions.duration.shortest }),
        '&:hover': {
          boxShadow: onOpenDetail ? 3 : undefined,
        },
      }}
      onClick={handleCardClick}
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
            <Chip label={badge.label} color={badge.color} size="small" icon={badge.icon} />
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
      {(onLogDose || onEdit || onMarkCompleted || onDelete) && (
        <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
          <Stack direction="row" spacing={1.5}>
            {onLogDose && (
              <Button
                variant="contained"
                size="small"
                color="primary"
                onClick={(event) => {
                  event.stopPropagation();
                  onLogDose(medication);
                }}
                disabled={
                  disableActions || isProcessing || medication.status !== 'active'
                }
              >
                {isProcessing ? <CircularProgress size={16} /> : 'Log dose'}
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(medication);
                }}
                disabled={disableActions}
              >
                Edit
              </Button>
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            {onMarkCompleted && (
              <Tooltip title="Mark medication as completed">
                <span>
                  <IconButton
                    color="success"
                    onClick={(event) => {
                      event.stopPropagation();
                      onMarkCompleted(medication);
                    }}
                    disabled={disableActions || isProcessing || medication.status === 'completed'}
                  >
                    <CheckCircleIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete medication">
                <span>
                  <IconButton
                    color="error"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(medication);
                    }}
                    disabled={disableActions || isProcessing}
                  >
                    <DeleteIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        </CardActions>
      )}
    </Card>
  );
};

export default MedicationCard;
