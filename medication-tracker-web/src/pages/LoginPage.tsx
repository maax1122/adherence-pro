/**
 * LoginPage Component
 * 
 * User authentication page with email/password login form.
 * 
 * Features:
 * - Email and password input fields with validation
 * - Sign in with Firebase Authentication
 * - Error message display for failed login attempts
 * - Loading state during authentication
 * - Link to registration page for new users
 * - Forgot password functionality
 * - Redirect to dashboard or intended page after successful login
 * 
 * Usage:
 * ```tsx
 * <Route path="/login" element={<LoginPage />} />
 * ```
 */

import { useState, FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { signIn, getAuthErrorMessage, signInWithGoogle } from '@/services/auth/authService';

// ============================================================================
// Component
// ============================================================================

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the page user was trying to access (for redirect after login)
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  // Form validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  /**
   * Validate password
   */
  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    setPasswordError('');
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);

    try {
      const result = await signIn({ email, password });

      if (result.error) {
        setError(getAuthErrorMessage(result.error));
      } else {
        // Successfully signed in, redirect to intended page
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (socialLoading) {
      return;
    }
    setError('');
    setSocialLoading(true);

    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(getAuthErrorMessage(result.error));
      } else {
        navigate(from, { replace: true });
      }
    } catch (_err) {
      setError('Unable to sign in with Google. Please try again.');
    } finally {
      setSocialLoading(false);
    }
  };

  /**
   * Handle forgot password
   */
  const handleForgotPassword = () => {
    // For now, just navigate to a placeholder
    // In a real app, this would open a dialog or navigate to a password reset page
    alert('Password reset functionality will be implemented in the forgot password flow');
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Logo/Title */}
          <Typography component="h1" variant="h4" gutterBottom>
            Medication Tracker
          </Typography>
          <Typography component="h2" variant="h6" color="text.secondary" gutterBottom>
            Sign In
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2} sx={{ width: '100%', mt: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={
                socialLoading ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />
              }
              onClick={handleGoogleSignIn}
              disabled={loading || socialLoading}
            >
              {socialLoading ? 'Signing in with Google...' : 'Continue with Google'}
            </Button>

            <Divider>or</Divider>
          </Stack>

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              error={!!emailError}
              helperText={emailError}
              disabled={loading || socialLoading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) validatePassword(e.target.value);
              }}
              onBlur={() => validatePassword(password)}
              error={!!passwordError}
              helperText={passwordError}
              disabled={loading || socialLoading}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || socialLoading}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Forgot Password Link */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={handleForgotPassword}
                type="button"
                disabled={loading}
              >
                Forgot password?
              </Link>
            </Box>

            {/* Register Link */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link component={RouterLink} to="/register" underline="hover">
                  Sign Up
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
