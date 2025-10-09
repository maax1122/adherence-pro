/**
 * PrivateRoute Component
 * 
 * A protected route wrapper that ensures only authenticated users
 * can access certain pages. Unauthenticated users are redirected
 * to the login page.
 * 
 * Features:
 * - Authentication check using Firebase Auth context
 * - Loading state during auth verification
 * - Automatic redirect to login for unauthenticated users
 * - Preserves intended destination for post-login redirect
 * 
 * Usage:
 * ```tsx
 * import { PrivateRoute } from '@/components/PrivateRoute';
 * 
 * <Route path="/dashboard" element={
 *   <PrivateRoute>
 *     <DashboardPage />
 *   </PrivateRoute>
 * } />
 * ```
 */

import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

interface PrivateRouteProps {
  /** The component(s) to render if user is authenticated */
  children: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

/**
 * PrivateRoute - Protects routes from unauthenticated access
 * 
 * @example
 * ```tsx
 * <Route path="/medications" element={
 *   <PrivateRoute>
 *     <MedicationsPage />
 *   </PrivateRoute>
 * } />
 * ```
 */
export function PrivateRoute({ children }: PrivateRouteProps) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  // Preserve the current location so we can redirect back after login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
