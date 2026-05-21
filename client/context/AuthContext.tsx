"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import {
  getToken,
  setToken,
  clearToken,
  decodeToken,
  isTokenValid,
  getGithubAuthUrl,
} from "@/lib/auth";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
  handleCallback: (token: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readUserFromStorage(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const token = getToken();
  if (!token || !isTokenValid(token)) return null;
  const decoded = decodeToken(token);
  if (!decoded) return null;
  return { id: decoded.sub, email: decoded.email };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readUserFromStorage);
  const [isLoading] = useState(false);

  const signIn = useCallback(() => {
    window.location.href = getGithubAuthUrl();
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    window.location.href = "/";
  }, []);

  const handleCallback = useCallback((token: string) => {
    setToken(token);
    const decoded = decodeToken(token);
    if (decoded) setUser({ id: decoded.sub, email: decoded.email });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, signIn, signOut, handleCallback }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
