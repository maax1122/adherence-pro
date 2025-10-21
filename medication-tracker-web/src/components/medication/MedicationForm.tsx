import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import type { FHIRDosage } from '@/types/fhir';

const ROUTE_OPTIONS = [
  { value: 'oral', label: 'Oral' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'topical', label: 'Topical' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'injection', label: 'Injection' },
];

const FORM_OPTIONS = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'spray', label: 'Spray' },
  { value: 'patch', label: 'Patch' },
];

const PRIORITY_OPTIONS: Array<{ value: MedicationFormValues['priority']; label: string }> = [
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'asap', label: 'ASAP' },
  { value: 'stat', label: 'STAT' },
];

const PERIOD_UNIT_OPTIONS = [
  { value: 'd', label: 'Day' },
  { value: 'wk', label: 'Week' },
  { value: 'mo', label: 'Month' },
];

const DOSAGE_UNITS = ['mg', 'mcg', 'g', 'ml', 'capsule', 'tablet', 'spray'];

export type PeriodUnit = 'd' | 'wk' | 'mo';

export interface MedicationFormValues {
  medicationName: string;
  dosageAmount?: string;
  dosageUnit?: string;
  medicationForm?: string;
  route?: string;
  frequency?: number | null;
  periodUnit: PeriodUnit;
  intakeTimes: string[];
  instructions?: string;
  startDate?: string;
  durationDays?: number | null;
  isPrn: boolean;
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
}

export interface MedicationFormSubmitPayload {
  medicationName: string;
  dosageInstruction: FHIRDosage[];
  isPrn: boolean;
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  dispenseRequest?: {
    validityPeriod?: {
      start?: string;
      end?: string;
    };
  };
  formValues: MedicationFormValues;
}

export interface MedicationFormProps {
  initialValues?: Partial<MedicationFormValues>;
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: MedicationFormSubmitPayload) => Promise<void> | void;
  onCancel?: () => void;
}

const defaultValues: MedicationFormValues = {
  medicationName: '',
  dosageAmount: '',
  dosageUnit: 'mg',
  medicationForm: 'tablet',
  route: 'oral',
  frequency: 1,
  periodUnit: 'd',
  intakeTimes: ['08:00'],
  instructions: '',
  startDate: '',
  durationDays: 30,
  isPrn: false,
  priority: 'routine',
};

const formatTimeDisplay = (time: string): string => {
  const [hours = '0', minutes = '0'] = time.split(':');
  const date = new Date();
  date.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0);
  if (Number.isNaN(date.getTime())) {
    return time;
  }
  return format(date, 'p');
};

const buildDosageInstruction = (values: MedicationFormValues): FHIRDosage => {
  const textParts: string[] = [];
  if (values.dosageAmount) {
    const unit = values.dosageUnit ? ` ${values.dosageUnit}` : '';
    textParts.push(`${values.dosageAmount}${unit}`);
  }
  if (values.medicationForm) {
    textParts.push(values.medicationForm);
  }
  textParts.push(values.medicationName);

  if (!values.isPrn && values.intakeTimes.length > 0) {
    const times = values.intakeTimes.map(formatTimeDisplay).join(', ');
    textParts.push(`at ${times}`);
  } else if (values.isPrn) {
    textParts.push('(taken as needed)');
  }

  const computedText = textParts.filter(Boolean).join(' ');
  const patientInstruction = values.instructions?.trim() || undefined;

  return {
    text: patientInstruction ?? computedText,
    patientInstruction,
    timing: {
      repeat: {
        period: 1,
        periodUnit: values.periodUnit,
        frequency:
          values.intakeTimes.length > 0
            ? values.intakeTimes.length
            : values.frequency ?? undefined,
        timeOfDay: values.intakeTimes.length > 0 ? values.intakeTimes : undefined,
      },
    },
    route: values.route ? { text: values.route } : undefined,
    asNeededBoolean: values.isPrn || undefined,
    doseAndRate:
      values.dosageAmount && !Number.isNaN(Number.parseFloat(values.dosageAmount))
        ? [
            {
              doseQuantity: {
                value: Number.parseFloat(values.dosageAmount),
                unit: values.dosageUnit || undefined,
              },
            },
          ]
        : undefined,
  };
};

const buildDispenseRequest = (values: MedicationFormValues) => {
  if (!values.startDate) {
    return undefined;
  }

  const start = new Date(`${values.startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return undefined;
  }

  const validityPeriod: { start?: string; end?: string } = {
    start: start.toISOString(),
  };

  if (values.durationDays && values.durationDays > 0) {
    const end = new Date(start);
    end.setDate(end.getDate() + values.durationDays - 1);
    validityPeriod.end = end.toISOString();
  }

  return { validityPeriod };
};

const validateValues = (values: MedicationFormValues) => {
  const errors: Record<string, string> = {};

  if (!values.medicationName.trim()) {
    errors.medicationName = 'Medication name is required';
  }

  if (!values.isPrn && values.intakeTimes.length === 0) {
    errors.intakeTimes = 'Add at least one intake time';
  }

  if (values.dosageAmount && Number.isNaN(Number.parseFloat(values.dosageAmount))) {
    errors.dosageAmount = 'Dosage must be a number';
  }

  if (values.durationDays != null) {
    const duration = Number(values.durationDays);
    if (Number.isNaN(duration) || duration < 1) {
      errors.durationDays = 'Duration must be at least 1 day';
    }
  }

  return errors;
};

export const MedicationForm: React.FC<MedicationFormProps> = ({
  initialValues,
  submitting = false,
  errorMessage,
  onSubmit,
  onCancel,
}) => {
  const [values, setValues] = useState<MedicationFormValues>({
    ...defaultValues,
    ...initialValues,
    intakeTimes: initialValues?.intakeTimes ?? defaultValues.intakeTimes,
  });
  const [timeInput, setTimeInput] = useState('08:00');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validationErrors = useMemo(() => validateValues(values), [values]);

  const handleFieldChange =
    (field: keyof MedicationFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;

      if (field === 'durationDays') {
        const numericValue = value === '' ? null : Number.parseInt(value, 10);
        setValues((prev) => ({
          ...prev,
          durationDays: Number.isNaN(numericValue) ? prev.durationDays ?? null : numericValue,
        }));
        return;
      }

      if (field === 'frequency') {
        const numericValue = value === '' ? null : Number.parseInt(value, 10);
        setValues((prev) => ({
          ...prev,
          frequency: Number.isNaN(numericValue) ? prev.frequency ?? null : numericValue,
        }));
        return;
      }

      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleTogglePrn = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setValues((prev) => ({
      ...prev,
      isPrn: checked,
    }));
  };

  const handleAddTime = () => {
    if (!timeInput) {
      setTimeError('Enter a time before adding');
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(timeInput)) {
      setTimeError('Enter time in HH:MM format');
      return;
    }

    setValues((prev) => {
      if (prev.intakeTimes.includes(timeInput)) {
        setTimeError('Time already added');
        return prev;
      }
      const nextTimes = [...prev.intakeTimes, timeInput].sort();
      return {
        ...prev,
        intakeTimes: nextTimes,
      };
    });

    setTimeInput('08:00');
    setTimeError(null);
  };

  const handleRemoveTime = (time: string) => {
    setValues((prev) => ({
      ...prev,
      intakeTimes: prev.intakeTimes.filter((existing) => existing !== time),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({
      medicationName: true,
      intakeTimes: true,
      dosageAmount: true,
      durationDays: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const payload: MedicationFormSubmitPayload = {
      medicationName: values.medicationName.trim(),
      dosageInstruction: [buildDosageInstruction(values)],
      isPrn: values.isPrn,
      priority: values.priority,
      dispenseRequest: buildDispenseRequest(values),
      formValues: values,
    };

    await onSubmit(payload);
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Medication details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Capture the prescription information to generate reminders and adherence logs.
          </Typography>
        </Box>

        {errorMessage && (
          <Typography color="error" variant="body2">
            {errorMessage}
          </Typography>
        )}

        <TextField
          label="Medication name"
          value={values.medicationName}
          onChange={handleFieldChange('medicationName')}
          onBlur={() => setTouched((prev) => ({ ...prev, medicationName: true }))}
          required
          fullWidth
          disabled={submitting}
          error={Boolean(touched.medicationName && validationErrors.medicationName)}
          helperText={
            touched.medicationName && validationErrors.medicationName
              ? validationErrors.medicationName
              : ' '
          }
        />

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Dosage amount"
              value={values.dosageAmount ?? ''}
              onChange={handleFieldChange('dosageAmount')}
              onBlur={() => setTouched((prev) => ({ ...prev, dosageAmount: true }))}
              fullWidth
              disabled={submitting}
              error={Boolean(touched.dosageAmount && validationErrors.dosageAmount)}
              helperText={
                touched.dosageAmount && validationErrors.dosageAmount
                  ? validationErrors.dosageAmount
                  : ' '
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Unit"
              value={values.dosageUnit ?? ''}
              onChange={handleFieldChange('dosageUnit')}
              select
              fullWidth
              disabled={submitting}
            >
              {DOSAGE_UNITS.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Form"
              value={values.medicationForm ?? ''}
              onChange={handleFieldChange('medicationForm')}
              select
              fullWidth
              disabled={submitting}
            >
              {FORM_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Route"
              value={values.route ?? ''}
              onChange={handleFieldChange('route')}
              select
              fullWidth
              disabled={submitting}
            >
              {ROUTE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Priority"
              value={values.priority ?? 'routine'}
              onChange={handleFieldChange('priority')}
              select
              fullWidth
              disabled={submitting}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={values.isPrn}
                  onChange={handleTogglePrn}
                  color="primary"
                  disabled={submitting}
                />
              }
              label="As needed (PRN)"
            />
          </Grid>
        </Grid>

        <Stack spacing={1}>
          <Typography variant="subtitle1">Intake schedule</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Time of day"
              type="time"
              value={timeInput}
              onChange={(event) => setTimeInput(event.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={submitting}
              sx={{ width: { xs: '100%', sm: 180 } }}
            />
            <Button variant="outlined" onClick={handleAddTime} disabled={submitting}>
              Add time
            </Button>
          </Stack>
          {(timeError || (touched.intakeTimes && validationErrors.intakeTimes)) && (
            <Typography variant="caption" color="error">
              {timeError || validationErrors.intakeTimes}
            </Typography>
          )}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {values.intakeTimes.map((time) => (
              <Chip
                key={time}
                label={formatTimeDisplay(time)}
                onDelete={submitting ? undefined : () => handleRemoveTime(time)}
                sx={{ mb: 1 }}
              />
            ))}
            {values.intakeTimes.length === 0 && !values.isPrn && (
              <Typography variant="body2" color="text.secondary">
                No times added yet.
              </Typography>
            )}
            {values.isPrn && (
              <Typography variant="body2" color="text.secondary">
                PRN medications do not require scheduled times.
              </Typography>
            )}
          </Stack>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Frequency (times per period)"
              type="number"
              value={values.frequency ?? ''}
              onChange={handleFieldChange('frequency')}
              disabled={submitting || values.intakeTimes.length > 0}
              helperText={
                values.intakeTimes.length > 0
                  ? 'Derived from scheduled times'
                  : 'Number of doses within each period'
              }
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Period unit"
              value={values.periodUnit}
              onChange={handleFieldChange('periodUnit')}
              select
              fullWidth
              disabled={submitting}
            >
              {PERIOD_UNIT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Duration (days)"
              type="number"
              value={values.durationDays ?? ''}
              onChange={handleFieldChange('durationDays')}
              onBlur={() => setTouched((prev) => ({ ...prev, durationDays: true }))}
              fullWidth
              disabled={submitting}
              error={Boolean(touched.durationDays && validationErrors.durationDays)}
              helperText={
                touched.durationDays && validationErrors.durationDays
                  ? validationErrors.durationDays
                  : ' '
              }
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Start date"
              type="date"
              value={values.startDate ?? ''}
              onChange={handleFieldChange('startDate')}
              InputLabelProps={{ shrink: true }}
              fullWidth
              disabled={submitting}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Instructions for patient"
              value={values.instructions ?? ''}
              onChange={handleFieldChange('instructions')}
              multiline
              minRows={3}
              fullWidth
              disabled={submitting}
            />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          {onCancel && (
            <Button variant="outlined" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save medication'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default MedicationForm;
