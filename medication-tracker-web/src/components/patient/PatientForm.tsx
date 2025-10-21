import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

export type PatientRelationship =
  | 'self'
  | 'parent'
  | 'child'
  | 'spouse'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'other';

export type PatientGender = 'male' | 'female' | 'other' | 'unknown';

export interface PatientFormValues {
  name: string;
  birthDate?: string;
  relationship?: PatientRelationship;
  gender?: PatientGender;
  photoFile?: File | null;
  photoUrl?: string;
}

export interface PatientFormProps {
  /**
   * Initial values for editing scenarios.
   * Defaults to an empty patient form.
   */
  initialValues?: PatientFormValues;
  /**
   * Called when the user submits the form.
   */
  onSubmit: (values: PatientFormValues) => Promise<void> | void;
  /**
   * Called when the user cancels the form.
   */
  onCancel?: () => void;
  /**
   * Indicates whether the form is currently submitting.
   */
  submitting?: boolean;
  /**
   * Optional error message to surface above the form.
   */
  errorMessage?: string | null;
}

const RELATIONSHIP_OPTIONS: Array<{ value: PatientRelationship; label: string }> = [
  { value: 'self', label: 'Self' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'other', label: 'Other' },
];

const GENDER_OPTIONS: Array<{ value: PatientGender; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Prefer not to say' },
];

const defaultValues: PatientFormValues = {
  name: '',
  relationship: 'self',
  gender: 'unknown',
};

/**
 * Controlled form used for creating and editing Patient profiles.
 * Encapsulates validation and UX guidelines pulled from the specification.
 */
export const PatientForm: React.FC<PatientFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  submitting = false,
  errorMessage,
}) => {
  const mergedInitialValues = useMemo(
    () => ({
      ...defaultValues,
      ...initialValues,
    }),
    [initialValues]
  );

  const [values, setValues] = useState<PatientFormValues>(mergedInitialValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const result: Record<string, string> = {};
    if (!values.name.trim()) {
      result.name = 'Name is required';
    }
    if (values.birthDate) {
      const date = new Date(values.birthDate);
      if (Number.isNaN(date.getTime())) {
        result.birthDate = 'Invalid date';
      }
    }
    return result;
  }, [values]);

  const handleChange =
    (field: keyof PatientFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setValues((previous) => ({
        ...previous,
        [field]: value,
      }));
    };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setValues((previous) => ({
      ...previous,
      photoFile: file,
    }));
  };

  const handleBlur = (field: keyof PatientFormValues) => () => {
    setTouched((previous) => ({
      ...previous,
      [field]: true,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({
      name: true,
      relationship: true,
      gender: true,
      birthDate: true,
    });

    if (Object.keys(errors).length > 0) {
      return;
    }

    await onSubmit(values);
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Patient Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Provide information for the person who will be receiving reminders.
          </Typography>
        </Box>

        {errorMessage && (
          <Typography color="error" variant="body2">
            {errorMessage}
          </Typography>
        )}

        <TextField
          id="patient-name"
          label="Full Name"
          value={values.name}
          onChange={handleChange('name')}
          onBlur={handleBlur('name')}
          required
          fullWidth
          disabled={submitting}
          error={touched.name && Boolean(errors.name)}
          helperText={touched.name && errors.name ? errors.name : ' '}
        />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              id="patient-relationship"
              label="Relationship"
              value={values.relationship}
              onChange={handleChange('relationship')}
              onBlur={handleBlur('relationship')}
              select
              fullWidth
              disabled={submitting}
            >
              {RELATIONSHIP_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              id="patient-gender"
              label="Gender"
              value={values.gender}
              onChange={handleChange('gender')}
              onBlur={handleBlur('gender')}
              select
              fullWidth
              disabled={submitting}
            >
              {GENDER_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              id="patient-birthdate"
              label="Date of Birth"
              type="date"
              value={values.birthDate ?? ''}
              onChange={handleChange('birthDate')}
              onBlur={handleBlur('birthDate')}
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={submitting}
              error={touched.birthDate && Boolean(errors.birthDate)}
              helperText={touched.birthDate && errors.birthDate ? errors.birthDate : ' '}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              component="label"
              variant="outlined"
              fullWidth
              disabled={submitting}
            >
              {values.photoFile ? values.photoFile.name : 'Upload Photo'}
              <input hidden type="file" accept="image/*" onChange={handleFileChange} />
            </Button>
            {values.photoUrl && !values.photoFile && (
              <Typography variant="caption" color="text.secondary">
                Current photo on record
              </Typography>
            )}
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          {onCancel && (
            <Button variant="outlined" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Profile'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default PatientForm;
