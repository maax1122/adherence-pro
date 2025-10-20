import React from 'react';
import { Alert, AlertColor, AlertProps, Collapse } from '@mui/material';

interface NotificationBannerProps {
  id?: string;
  visible: boolean;
  severity?: AlertColor;
  icon?: AlertProps['icon'];
  action?: AlertProps['action'];
  children: React.ReactNode;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  id,
  visible,
  severity = 'info',
  icon,
  action,
  children,
}) => {
  return (
    <Collapse in={visible} unmountOnExit>
      <Alert
        id={id}
        icon={icon}
        action={action}
        severity={severity}
        sx={{ mb: 2 }}
      >
        {children}
      </Alert>
    </Collapse>
  );
};

export default NotificationBanner;
