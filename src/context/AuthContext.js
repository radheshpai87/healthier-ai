/**
 * AuthContext.js
 * ─────────────────────────────────────────────
 * Provides the currently logged-in user to all
 * child components via React context.
 *
 * Usage:
 *   const { user, refreshUser, logout } = useAuth();
 * ─────────────────────────────────────────────
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  getCurrentUser,
  logout as authLogout,
  updateDisplayName,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  /** Re-fetch user from SecureStore and update context. */
  const refreshUser = useCallback(async () => {
    const u = await getCurrentUser();
    setUser(u);
    return u;
  }, []);

  /** Log out the current user and clear context. */
  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
  }, []);

  /** Update display name and refresh context. */
  const setDisplayName = useCallback(async (name) => {
    await updateDisplayName(name);
    await refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, refreshUser, logout, setUser, setDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Convenience hook for consuming AuthContext.
 * @returns {{ user: import('../services/authService').UserRecord|null, refreshUser: Function, logout: Function, setUser: Function, setDisplayName: Function }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
