import React from 'react';
import {
  Avatar,
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import type { PatientDocument } from '@/types/fhir';

export interface PatientCardProps {
  patient: PatientDocument;
  onSelect?: (patient: PatientDocument) => void;
  selected?: boolean;
  actions?: React.ReactNode;
  showRelationshipChip?: boolean;
}

const getDisplayName = (patient: PatientDocument): string => {
  const name = patient.name?.[0];
  if (name?.text) {
    return name.text;
  }
  if (name?.given?.length) {
    return name.given.join(' ');
  }
  return 'Unnamed Profile';
};

const getAvatarInitial = (patient: PatientDocument): string => {
  const displayName = getDisplayName(patient);
  return displayName.trim().charAt(0).toUpperCase() || '?';
};

const formatRelationship = (relationship?: string | null): string => {
  if (!relationship) {
    return 'Unknown';
  }
  return relationship.replace(/_/g, ' ');
};

/**
 * Lightweight card for displaying patient profiles. Used across dashboard and family management pages.
 */
export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  onSelect,
  selected = false,
  actions,
  showRelationshipChip = true,
}) => {
  const theme = useTheme();
  const name = getDisplayName(patient);
  const relationshipLabel = formatRelationship(patient.relationship);

  const content = (
    <Card
      variant={selected ? 'outlined' : undefined}
      sx={{
        borderColor: selected ? theme.palette.primary.main : undefined,
        boxShadow: selected ? theme.shadows[4] : theme.shadows[1],
        transition: theme.transitions.create(['box-shadow', 'transform'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          boxShadow: theme.shadows[6],
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardHeader
        avatar={
          <Avatar
            src={patient.photo?.[0]?.url}
            alt={name}
            sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.common.white }}
          >
            {getAvatarInitial(patient)}
          </Avatar>
        }
        title={
          <Typography variant="h6" component="div">
            {name}
          </Typography>
        }
        subheader={
          <Stack direction="row" spacing={1} alignItems="center">
            {showRelationshipChip && (
              <Chip label={relationshipLabel} size="small" color="default" />
            )}
            {patient.birthDate && (
              <Typography variant="caption" color="text.secondary">
                DOB: {patient.birthDate}
              </Typography>
            )}
          </Stack>
        }
        action={actions}
      />
      <CardContent>
        <Stack spacing={1}>
          {patient.active === false && (
            <Chip label="Inactive" size="small" color="warning" variant="outlined" />
          )}
          {patient.extension
            ?.filter((extension) =>
              extension.url?.includes('StructureDefinition/profile-role') &&
              extension.valueCode &&
              extension.valueCode !== patient.relationship
            )
            .map((extension) => (
              <Chip
                key={extension.url}
                label={formatRelationship(extension.valueCode)}
                size="small"
                variant="outlined"
              />
            ))}
          <Typography variant="body2" color="text.secondary">
            Patient ID: {patient.id}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );

  if (!onSelect) {
    return content;
  }

  return (
    <CardActionArea onClick={() => onSelect(patient)} sx={{ borderRadius: 2 }}>
      {content}
    </CardActionArea>
  );
};

export default PatientCard;
