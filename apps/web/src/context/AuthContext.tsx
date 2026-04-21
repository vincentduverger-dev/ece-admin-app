import { createContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { loginAdmin } from "../lib/api";
import type { AuthUser } from "../lib/api";

const AUTH_TOKEN_STORAGE_KEY = "auth_token";
const AUTH_USER_STORAGE_KEY = "auth_user";

type AuthSession = {
  token: string | null;
  user: AuthUser | null;
};

export type AuthContextValue = {
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  token: string | null;
  user: AuthUser | null;
};

const createEmptyAuthSession = (): AuthSession => ({
  token: null,
  user: null
});

const readStorageItem = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorageItem = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures and keep the in-memory session state.
  }
};

const removeStorageItem = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
};

const isAuthUser = (value: unknown): value is AuthUser => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as { role?: unknown };

  return candidate.role === "admin";
};

const clearStoredAuthSession = (): void => {
  removeStorageItem(AUTH_TOKEN_STORAGE_KEY);
  removeStorageItem(AUTH_USER_STORAGE_KEY);
};

const persistAuthSession = (session: AuthSession): void => {
  if (!session.token) {
    clearStoredAuthSession();
    return;
  }

  writeStorageItem(AUTH_TOKEN_STORAGE_KEY, session.token);

  if (session.user) {
    writeStorageItem(AUTH_USER_STORAGE_KEY, JSON.stringify(session.user));
    return;
  }

  removeStorageItem(AUTH_USER_STORAGE_KEY);
};

const readStoredAuthSession = (): AuthSession => {
  const storedToken = readStorageItem(AUTH_TOKEN_STORAGE_KEY);
  const token =
    typeof storedToken === "string" && storedToken.trim().length > 0
      ? storedToken
      : null;

  if (!token) {
    clearStoredAuthSession();
    return createEmptyAuthSession();
  }

  const storedUser = readStorageItem(AUTH_USER_STORAGE_KEY);

  if (!storedUser) {
    return {
      token,
      user: null
    };
  }

  try {
    const parsedUser = JSON.parse(storedUser) as unknown;

    if (isAuthUser(parsedUser)) {
      return {
        token,
        user: parsedUser
      };
    }
  } catch {
    // Ignore invalid JSON and clear the stored user below.
  }

  removeStorageItem(AUTH_USER_STORAGE_KEY);

  return {
    token,
    user: null
  };
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession>(createEmptyAuthSession);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    setSession(readStoredAuthSession());
    setIsLoadingAuth(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const nextSession = await loginAdmin(email, password);

    persistAuthSession(nextSession);
    setSession(nextSession);
  };

  const logout = (): void => {
    clearStoredAuthSession();
    setSession(createEmptyAuthSession());
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: session.token !== null,
        isLoadingAuth,
        login,
        logout,
        token: session.token,
        user: session.user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
