import React from 'react';
import { Grid, Typography } from '@mui/material';
import type { MedicationRequestDocument } from '@/types/fhir';
import { MedicationCard } from './MedicationCard';

export interface MedicationListProps {
  medications: MedicationRequestDocument[];
  actionLoadingMap?: Record<string, boolean>;
  disableActions?: boolean;
  emptyMessage?: string;
  onLogDose?: (medication: MedicationRequestDocument) => void;
  onEdit?: (medication: MedicationRequestDocument) => void;
  onMarkCompleted?: (medication: MedicationRequestDocument) => void;
  onDelete?: (medication: MedicationRequestDocument) => void;
  onOpenDetail?: (medication: MedicationRequestDocument) => void;
}

export const MedicationList: React.FC<MedicationListProps> = ({
  medications,
  actionLoadingMap,
  disableActions = false,
  emptyMessage = 'No medications found for this profile.',
  onLogDose,
  onEdit,
  onMarkCompleted,
  onDelete,
  onOpenDetail,
}) => {
  if (medications.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Grid container spacing={3}>
      {medications.map((medication) => (
        <Grid item xs={12} md={6} key={medication.id}>
          <MedicationCard
            medication={medication}
            onLogDose={onLogDose}
            onEdit={onEdit}
            onMarkCompleted={onMarkCompleted}
            onDelete={onDelete}
            onOpenDetail={onOpenDetail}
            isProcessing={Boolean(actionLoadingMap?.[medication.id])}
            disableActions={disableActions}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default MedicationList;
