import React, { useCallback, useMemo, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  CircularProgress,
  CssBaseline,
  Dialog,
  DialogContent,
  DialogTitle,
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
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileContext } from '@/contexts/ProfileContext';
import useOnlineStatus from '@/hooks/useOnlineStatus';
import * as authService from '@/services/auth/authService';
import NotificationBanner from '@/components/NotificationBanner';
import ProfileSwitcher from '@/components/family/ProfileSwitcher';
import { PatientForm, PatientFormValues } from '@/components/patient/PatientForm';

const drawerWidth = 264;

interface LayoutProps {
  children?: React.ReactNode;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const {
    profiles,
    isLoading,
    error,
    isCreating,
    createProfile,
    refreshProfiles,
  } = useProfileContext();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();

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
    // Settings page to be implemented in a future iteration
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

  const handleNavigationClick = () => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const handleOpenCreateProfile = () => {
    setCreateError(null);
    setCreateDialogOpen(true);
  };

  const handleCloseCreateProfile = () => {
    if (isCreating) {
      return;
    }
    setCreateError(null);
    setCreateDialogOpen(false);
  };

  const handleSubmitCreateProfile = useCallback(
    async (values: PatientFormValues) => {
      setCreateError(null);
      try {
        await createProfile({
          name: values.name.trim(),
          birthDate: values.birthDate || undefined,
          gender: values.gender,
          relationship: values.relationship,
          photoUrl: undefined,
        });
        setCreateDialogOpen(false);
      } catch (createProfileError) {
        console.error('Failed to create profile from layout dialog', createProfileError);
        setCreateError(
          createProfileError instanceof Error
            ? createProfileError.message
            : 'Unable to create profile. Please try again.'
        );
        // Ensure list remains fresh on failure
        await refreshProfiles().catch(() => {
          // Errors surfaced via context banner
        });
      }
    },
    [createProfile, refreshProfiles]
  );

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
              <ProfileSwitcher onAddProfile={handleOpenCreateProfile} disabled={isCreating} />
              {(isLoading || isCreating) && <CircularProgress size={20} />}
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
          id="profile-error-banner"
          visible={Boolean(error)}
          severity="error"
          icon={<ErrorOutlineIcon fontSize="inherit" />}
        >
          {error}
        </NotificationBanner>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {children ?? <Outlet />}
        </Box>
      </Box>

      <Dialog open={isCreateDialogOpen} onClose={handleCloseCreateProfile} fullWidth maxWidth="sm">
        <DialogTitle>Create profile</DialogTitle>
        <DialogContent dividers sx={{ pt: 3 }}>
          <PatientForm
            onSubmit={handleSubmitCreateProfile}
            onCancel={handleCloseCreateProfile}
            submitting={isCreating}
            errorMessage={createError}
            initialValues={
              profiles.length === 0
                ? { relationship: 'self', name: currentUser?.displayName ?? '' }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Layout;
