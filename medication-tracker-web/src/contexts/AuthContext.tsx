/**
 * Authentication Context for Web
 * 
 * Provides authentication state and methods throughout the app.
 * Automatically subscribes to Firebase auth state changes.
 * 
 * Features:
 * - Current user state with loading indicator
 * - Auth state persistence across page reloads
 * - Type-safe context with TypeScript
 * - Auto-cleanup of listeners
 * 
 * Usage:
 * ```tsx
 * import { useAuth } from '@/contexts/AuthContext';
 * 
 * function MyComponent() {
 *   const { currentUser, loading } = useAuth();
 *   if (loading) return <Loading />;
 *   if (!currentUser) return <Login />;
 *   return <Dashboard user={currentUser} />;
 * }
 * ```
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';

// ============================================================================
// Types
// ============================================================================

interface AuthContextValue {
  /** Currently authenticated user, null if not logged in */
  currentUser: User | null;
  /** True while checking auth state on initial load */
  loading: boolean;
  /** True if user is authenticated */
  isAuthenticated: boolean;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    currentUser,
    loading,
    isAuthenticated: currentUser !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access authentication state
 * 
 * @throws Error if used outside AuthProvider
 * 
 * @example
 * ```tsx
 * const { currentUser, loading, isAuthenticated } = useAuth();
 * 
 * if (loading) {
 *   return <Spinner />;
 * }
 * 
 * if (!isAuthenticated) {
 *   return <Navigate to="/login" />;
 * }
 * 
 * return <div>Welcome {currentUser.email}</div>;
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
