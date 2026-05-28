/**
 * auth.ts — Authentication state management for Mediqueue.
 *
 * Token is stored in localStorage under "mq_token".
 * User profile is stored under "mq_user".
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { createElement } from "react";
import { authApi } from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────
export type AuthUser = {
  name: string;
  last_name: string;
  email: string;
  mobile: string;
};

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (profile: AuthUser) => void;
};

// ── Storage helpers ───────────────────────────────────────────────────────────
const TOKEN_KEY = "mq_token";
const USER_KEY = "mq_user";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from storage on mount
  useEffect(() => {
    const stored = getStoredUser();
    const token = getStoredToken();
    if (stored && token) {
      setUser(stored);
    }
    setIsLoading(false);
  }, []);

  const login = async (payload: string, password: string) => {
    const data = await authApi.signin({ payload, password });
    const profile: AuthUser = {
      name: data.name,
      last_name: data.last_name,
      email: data.email,
      mobile: data.mobile,
    };
    setAuth(data.token, profile);
    setUser(profile);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  const updateUser = (profile: AuthUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    setUser(profile);
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
