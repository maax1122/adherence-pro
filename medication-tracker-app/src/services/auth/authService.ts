/**
 * Firebase Authentication Service
 * 
 * Handles user authentication with email/password.
 * 
 * Features:
 * - Sign up with email/password
 * - Sign in with email/password
 * - Sign out
 * - Auth state listener
 * - Error handling for common auth errors
 * 
 * @requires React Native Firebase Auth
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

type User = FirebaseAuthTypes.User;
type AuthError = FirebaseAuthTypes.NativeFirebaseAuthError;

// ============================================================================
// Types
// ============================================================================

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  error?: never;
}

export interface AuthErrorResult {
  user?: never;
  error: AuthError;
}

export type AuthResponse = AuthResult | AuthErrorResult;

// ============================================================================
// Auth Service
// ============================================================================

/**
 * Sign up a new user with email and password
 */
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(
      data.email,
      data.password
    );

    // Update display name
    await userCredential.user.updateProfile({
      displayName: data.displayName,
    });

    return { user: userCredential.user };
  } catch (error) {
    return { error: error as AuthError };
  }
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(data: SignInData): Promise<AuthResponse> {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(data.email, data.password);
    return { user: userCredential.user };
  } catch (error) {
    return { error: error as AuthError };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  await auth().signOut();
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth().currentUser;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  return auth().onAuthStateChanged(callback);
}

/**
 * Get user-friendly error message from AuthError
 */
export function getAuthErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return error.message || 'An authentication error occurred.';
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return auth().currentUser !== null;
}

/**
 * Get current user ID
 */
export function getCurrentUserId(): string | null {
  return auth().currentUser?.uid || null;
}

/**
 * Reload current user data
 */
export async function reloadUser(): Promise<void> {
  const currentUser = auth().currentUser;
  if (currentUser) {
    await currentUser.reload();
  }
}
