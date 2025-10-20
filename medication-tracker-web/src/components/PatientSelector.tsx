import React from 'react';
import {
  Avatar,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { PatientDocument } from '@/types/fhir';

interface PatientSelectorProps {
  patients: PatientDocument[];
  selectedPatientId: string | null;
  onChange: (patientId: string) => void;
  disabled?: boolean;
  label?: string;
}

const DEFAULT_LABEL = 'Profile';

const getPatientLabel = (patient: PatientDocument): string => {
  if (patient.name?.[0]?.text) {
    return patient.name[0].text;
  }

  if (patient.name?.[0]?.given?.length) {
    return patient.name[0].given.join(' ');
  }

  return 'Unknown Profile';
};

const getPatientInitial = (patient: PatientDocument): string => {
  const label = getPatientLabel(patient);
  return label.trim().charAt(0).toUpperCase() || '?';
};

export const PatientSelector: React.FC<PatientSelectorProps> = ({
  patients,
  selectedPatientId,
  onChange,
  disabled = false,
  label = DEFAULT_LABEL,
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    if (!event.target.value || event.target.value === '__no-patient__') {
      return;
    }

    onChange(event.target.value);
  };

  const hasPatients = patients.length > 0;
  const value = hasPatients ? selectedPatientId ?? patients[0].id : '__no-patient__';

  return (
    <FormControl
      size="small"
      variant="outlined"
      sx={{ minWidth: 160 }}
      disabled={disabled || !hasPatients}
    >
      <InputLabel id="patient-selector-label">{label}</InputLabel>
      <Select
        labelId="patient-selector-label"
        id="patient-selector"
        value={value}
        label={label}
        onChange={handleChange}
        renderValue={(selected) => {
          if (!hasPatients || selected === '__no-patient__') {
            return 'No profiles yet';
          }

          const patient = patients.find((p) => p.id === selected);
          return patient ? getPatientLabel(patient) : label;
        }}
      >
        {hasPatients ? (
          patients.map((patient) => (
            <MenuItem key={patient.id} value={patient.id}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Avatar src={patient.photo?.[0]?.url} sx={{ width: 32, height: 32 }}>
                  {getPatientInitial(patient)}
                </Avatar>
              </ListItemIcon>
              <ListItemText primary={getPatientLabel(patient)} />
            </MenuItem>
          ))
        ) : (
          <MenuItem value="__no-patient__" disabled>
            No profiles yet
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
};

export default PatientSelector;
