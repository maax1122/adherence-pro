/**
 * RegisterPage Component
 * 
 * User registration page with email/password signup form.
 * 
 * Features:
 * - Email, password, and display name input fields with validation
 * - Password confirmation to prevent typos
 * - Password strength indicator
 * - Sign up with Firebase Authentication
 * - Error message display for failed registration attempts
 * - Loading state during authentication
 * - Link to login page for existing users
 * - Auto-login and redirect after successful registration
 * 
 * Usage:
 * ```tsx
 * <Route path="/register" element={<RegisterPage />} />
 * ```
 */

import { useState, FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Link,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { signUp, getAuthErrorMessage } from '@/services/auth/authService';

// ============================================================================
// Types
// ============================================================================

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: 'error' | 'warning' | 'info' | 'success';
}

// ============================================================================
// Component
// ============================================================================

export default function RegisterPage() {
  const navigate = useNavigate();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form validation state
  const [displayNameError, setDisplayNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  /**
   * Calculate password strength
   */
  const getPasswordStrength = (password: string): PasswordStrength => {
    if (!password) {
      return { score: 0, label: '', color: 'error' };
    }

    let score = 0;

    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Contains lowercase and uppercase
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;

    // Contains numbers
    if (/\d/.test(password)) score++;

    // Contains special characters
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // Normalize to 0-4 scale
    const normalizedScore = Math.min(Math.floor(score / 1.25), 4);

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors: Array<'error' | 'warning' | 'info' | 'success'> = [
      'error',
      'error',
      'warning',
      'info',
      'success',
    ];

    return {
      score: normalizedScore,
      label: labels[normalizedScore],
      color: colors[normalizedScore],
    };
  };

  const passwordStrength = getPasswordStrength(password);

  /**
   * Validate display name
   */
  const validateDisplayName = (name: string): boolean => {
    if (!name.trim()) {
      setDisplayNameError('Name is required');
      return false;
    }
    if (name.trim().length < 2) {
      setDisplayNameError('Name must be at least 2 characters');
      return false;
    }
    setDisplayNameError('');
    return true;
  };

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
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  /**
   * Validate password confirmation
   */
  const validateConfirmPassword = (confirmPwd: string): boolean => {
    if (!confirmPwd) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    if (confirmPwd !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    const isNameValid = validateDisplayName(displayName);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmValid = validateConfirmPassword(confirmPassword);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
      return;
    }

    setLoading(true);

    try {
      const result = await signUp({
        email,
        password,
        displayName: displayName.trim(),
      });

      if (result.error) {
        setError(getAuthErrorMessage(result.error));
      } else {
        // Successfully registered and auto-logged in, redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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
            Create Account
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Registration Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="displayName"
              label="Full Name"
              name="displayName"
              autoComplete="name"
              autoFocus
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (displayNameError) validateDisplayName(e.target.value);
              }}
              onBlur={() => validateDisplayName(displayName)}
              error={!!displayNameError}
              helperText={displayNameError}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              error={!!emailError}
              helperText={emailError}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) validatePassword(e.target.value);
                if (confirmPassword) validateConfirmPassword(confirmPassword);
              }}
              onBlur={() => validatePassword(password)}
              error={!!passwordError}
              helperText={passwordError}
              disabled={loading}
            />

            {/* Password Strength Indicator */}
            {password && (
              <Box sx={{ mt: 1, mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Password Strength:
                  </Typography>
                  <Typography variant="caption" color={`${passwordStrength.color}.main`}>
                    {passwordStrength.label}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(passwordStrength.score / 4) * 100}
                  color={passwordStrength.color}
                  sx={{ height: 6, borderRadius: 1 }}
                />
              </Box>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (confirmPasswordError) validateConfirmPassword(e.target.value);
              }}
              onBlur={() => validateConfirmPassword(confirmPassword)}
              error={!!confirmPasswordError}
              helperText={confirmPasswordError}
              disabled={loading}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            {/* Login Link */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link component={RouterLink} to="/login" underline="hover">
                  Sign In
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
