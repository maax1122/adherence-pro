import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppBar,
  Avatar,
  Box,
  CircularProgress,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  CloudOff as CloudOffIcon,
  Dashboard as DashboardIcon,
  ErrorOutline as ErrorOutlineIcon,
  FamilyRestroom as FamilyRestroomIcon,
  Logout as LogoutIcon,
  Medication as MedicationIcon,
  Menu as MenuIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import type { User } from 'firebase/auth';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import useOnlineStatus from '@/hooks/useOnlineStatus';
import * as authService from '@/services/auth/authService';
import { getUserPatients } from '@/services/firestore/patientService';
import { PatientDocument } from '@/types/fhir';
import NotificationBanner from '@/components/NotificationBanner';
import PatientSelector from '@/components/PatientSelector';

const drawerWidth = 264;

interface LayoutProps {
  children?: React.ReactNode;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface LayoutContextValue {
  patients: PatientDocument[];
  selectedPatientId: string | null;
  selectedPatient: PatientDocument | null;
  isLoadingPatients: boolean;
  patientError: string | null;
  refreshPatients: () => Promise<PatientDocument[]>;
  selectPatient: (patientId: string) => void;
  currentUser: User | null;
  isOnline: boolean;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export const useLayoutContext = (): LayoutContextValue => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext must be used within Layout');
  }
  return context;
};

const Layout = ({ children }: LayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const [patients, setPatients] = useState<PatientDocument[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPatients = useCallback(async (): Promise<PatientDocument[]> => {
    if (!currentUser) {
      if (isMountedRef.current) {
        setPatients([]);
        setSelectedPatientId(null);
        setPatientError(null);
      }
      return [];
    }

    if (isMountedRef.current) {
      setIsLoadingPatients(true);
      setPatientError(null);
    }

    try {
      const userPatients = await getUserPatients(currentUser.uid);

      if (isMountedRef.current) {
        setPatients(userPatients);
        setSelectedPatientId((previous) => {
          if (previous && userPatients.some((patient) => patient.id === previous)) {
            return previous;
          }
          return userPatients[0]?.id ?? null;
        });
      }

      return userPatients;
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Failed to load patient profiles', error);
        setPatients([]);
        setSelectedPatientId(null);
        setPatientError('Unable to load profiles. Please try again.');
      }

      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoadingPatients(false);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    fetchPatients().catch(() => {
      // Error already handled in fetchPatients
    });
  }, [fetchPatients]);

  const handleDrawerToggle = () => {
    setMobileOpen((previous) => !previous);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await authService.signOut();
    navigate('/login');
  };

  const handleSettings = () => {
    handleMenuClose();
    // Settings route will be provided in a future web task
  };

  const handlePatientSelect = useCallback((patientId: string) => {
    setSelectedPatientId(patientId);
  }, []);

  const handleNavigationClick = () => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const navigationItems = useMemo<NavigationItem[]>(
    () => [
      { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
      { label: 'Medications', path: '/medications', icon: <MedicationIcon /> },
      { label: 'Family', path: '/family', icon: <FamilyRestroomIcon /> },
    ],
    []
  );

  const userInitial = useMemo(() => {
    if (!currentUser) {
      return '?';
    }

    if (currentUser.displayName) {
      return currentUser.displayName.charAt(0).toUpperCase();
    }

    if (currentUser.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }

    return '?';
  }, [currentUser]);

  const contextValue = useMemo<LayoutContextValue>(() => {
    const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? null;

    return {
      patients,
      selectedPatientId,
      selectedPatient,
      isLoadingPatients,
      patientError,
      refreshPatients: fetchPatients,
      selectPatient: handlePatientSelect,
      currentUser,
      isOnline,
    };
  }, [
    patients,
    selectedPatientId,
    isLoadingPatients,
    patientError,
    fetchPatients,
    handlePatientSelect,
    currentUser,
    isOnline,
  ]);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="subtitle1" noWrap>
          Adherence Pro
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname.startsWith(item.path)}
              onClick={handleNavigationClick}
              sx={{
                borderRadius: '0 24px 24px 0',
                '&.Mui-selected': {
                  backgroundColor: (theme) => theme.palette.action.selected,
                  borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
                },
                '&.Mui-selected .MuiListItemIcon-root': {
                  color: 'primary.main',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: (theme) => theme.palette.action.selected,
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton disabled>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" secondary="Coming soon" />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <LayoutContext.Provider value={contextValue}>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          color="primary"
          elevation={1}
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            <IconButton
              color="inherit"
              aria-label="open navigation"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{
                mr: 2,
                display: { sm: 'none' },
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Medication Tracker
            </Typography>
            {currentUser && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PatientSelector
                  patients={patients}
                  selectedPatientId={selectedPatientId}
                  onChange={handlePatientSelect}
                  disabled={isLoadingPatients || patients.length === 0}
                />
                {isLoadingPatients && <CircularProgress size={20} />}
                <IconButton
                  size="large"
                  aria-label="user menu"
                  aria-controls="user-menu"
                  aria-haspopup="true"
                  onClick={handleMenuOpen}
                  color="inherit"
                >
                  <Avatar sx={{ width: 34, height: 34 }}>{userInitial}</Avatar>
                </IconButton>
                <Menu
                  id="user-menu"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  keepMounted
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={handleSettings} disabled>
                    <ListItemIcon>
                      <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    Settings
                  </MenuItem>
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    Logout
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Toolbar>
        </AppBar>
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="primary navigation"
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
              },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            open
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
              },
            }}
          >
            {drawer}
          </Drawer>
        </Box>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Toolbar />
          <NotificationBanner
            id="offline-banner"
            visible={!isOnline}
            severity="warning"
            icon={<CloudOffIcon fontSize="inherit" />}
          >
            You are currently offline. Some features may be unavailable.
          </NotificationBanner>
          <NotificationBanner
            id="patient-error-banner"
            visible={Boolean(patientError)}
            severity="error"
            icon={<ErrorOutlineIcon fontSize="inherit" />}
          >
            {patientError}
          </NotificationBanner>
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {children ?? <Outlet />}
          </Box>
        </Box>
      </Box>
    </LayoutContext.Provider>
  );
};

export default Layout;
export { LayoutContext };
