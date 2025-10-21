/**
 * Firebase Authentication Service (Web)
 * 
 * Handles user authentication with email/password for web platform.
 * 
 * Features:
 * - Sign up with email/password
 * - Sign in with email/password
 * - Sign out
 * - Password reset
 * - Auth state listener
 * - Error handling for common auth errors
 * 
 * @requires Firebase Web SDK Auth
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
  AuthError,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/config/firebase';

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

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// ============================================================================
// Auth Service
// ============================================================================

/**
 * Sign up a new user with email and password
 * 
 * @param data - User registration data (email, password, displayName)
 * @returns Promise with user object or error
 * 
 * @example
 * ```ts
 * const result = await signUp({
 *   email: 'user@example.com',
 *   password: 'securePassword123',
 *   displayName: 'John Doe'
 * });
 * 
 * if (result.error) {
 *   console.error(getAuthErrorMessage(result.error));
 * } else {
 *   console.log('User registered:', result.user.uid);
 * }
 * ```
 */
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    // Update display name
    await updateProfile(userCredential.user, {
      displayName: data.displayName,
    });

    return { user: userCredential.user };
  } catch (error) {
    return { error: error as AuthError };
  }
}

/**
 * Sign in an existing user with email and password
 * 
 * @param data - User login credentials (email, password)
 * @returns Promise with user object or error
 * 
 * @example
 * ```ts
 * const result = await signIn({
 *   email: 'user@example.com',
 *   password: 'securePassword123'
 * });
 * 
 * if (result.error) {
 *   console.error(getAuthErrorMessage(result.error));
 * } else {
 *   console.log('User signed in:', result.user.email);
 * }
 * ```
 */
export async function signIn(data: SignInData): Promise<AuthResponse> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
    return { user: userCredential.user };
  } catch (error) {
    return { error: error as AuthError };
  }
}

/**
 * Sign in using Google provider
 *
 * @returns Promise with user object or error
 */
export async function signInWithGoogle(): Promise<AuthResponse> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user };
  } catch (error) {
    return { error: error as AuthError };
  }
}

/**
 * Sign out the current user
 * 
 * @returns Promise that resolves when sign out is complete
 * 
 * @example
 * ```ts
 * await signOut();
 * console.log('User signed out');
 * ```
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Send password reset email to user
 * 
 * @param email - User's email address
 * @returns Promise that resolves when email is sent
 * 
 * @example
 * ```ts
 * try {
 *   await resetPassword('user@example.com');
 *   console.log('Password reset email sent');
 * } catch (error) {
 *   console.error('Failed to send reset email:', error);
 * }
 * ```
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Get the current authenticated user
 * 
 * @returns Current user object or null if not authenticated
 * 
 * @example
 * ```ts
 * const user = getCurrentUser();
 * if (user) {
 *   console.log('Logged in as:', user.email);
 * } else {
 *   console.log('Not authenticated');
 * }
 * ```
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Listen to auth state changes
 * 
 * @param callback - Function called when auth state changes
 * @returns Unsubscribe function to stop listening
 * 
 * @example
 * ```ts
 * const unsubscribe = onAuthStateChanged((user) => {
 *   if (user) {
 *     console.log('User logged in:', user.uid);
 *   } else {
 *     console.log('User logged out');
 *   }
 * });
 * 
 * // Later, stop listening:
 * unsubscribe();
 * ```
 */
export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Get user-friendly error message from AuthError
 * 
 * Translates Firebase auth error codes into human-readable messages.
 * 
 * @param error - Firebase AuthError object
 * @returns User-friendly error message
 * 
 * @example
 * ```ts
 * const result = await signIn({ email, password });
 * if (result.error) {
 *   const message = getAuthErrorMessage(result.error);
 *   alert(message); // "Incorrect password. Please try again."
 * }
 * ```
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
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed. Please contact support.';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before completing. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in attempt is already in progress.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Please allow popups or try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with a different credential. Please sign in using your original provider.';
    default:
      return error.message || 'An authentication error occurred.';
  }
}

/**
 * Check if user is authenticated
 * 
 * @returns True if user is logged in, false otherwise
 * 
 * @example
 * ```ts
 * if (isAuthenticated()) {
 *   console.log('User is logged in');
 * } else {
 *   console.log('User is not logged in');
 * }
 * ```
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}

/**
 * Get current user ID
 * 
 * @returns User UID or null if not authenticated
 * 
 * @example
 * ```ts
 * const userId = getCurrentUserId();
 * if (userId) {
 *   console.log('Current user ID:', userId);
 * }
 * ```
 */
export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid || null;
}

/**
 * Reload current user data from Firebase
 * 
 * Useful after updating user profile or when you need fresh user data.
 * 
 * @returns Promise that resolves when user data is reloaded
 * 
 * @example
 * ```ts
 * await updateProfile(user, { displayName: 'New Name' });
 * await reloadUser(); // Refresh user data
 * console.log('User data reloaded');
 * ```
 */
export async function reloadUser(): Promise<void> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    await currentUser.reload();
  }
}
