"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getToken,
  setToken,
  clearToken,
  decodeToken,
  isTokenValid,
  getGithubAuthUrl,
  verifySession,
  markSignedOut,
  consumeSignedOut,
} from "@/lib/auth";

interface AuthUser {
  id: string;
  email: string;
  /** Filled in once the server profile loads; the JWT carries only id + email. */
  name?: string;
  githubLogin?: string;
  avatarUrl?: string | null;
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
  // Start null on BOTH server and client so hydration matches (SSR can't see
  // localStorage); the real auth state loads right after mount.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Deferred a tick: reading localStorage synchronously in the effect body
    // would trip react-hooks/set-state-in-effect and still block paint.
    const t = setTimeout(() => {
      const stored = readUserFromStorage();
      setUser(stored);
      setIsLoading(false);

      // A locally-decoded JWT only proves it hasn't expired. It says nothing
      // about whether the account still exists, whether the signing secret
      // rotated, or whether this is a stale token left behind by whoever used
      // the browser last — so confirm with the server and drop it if rejected.
      const token = getToken();
      if (!stored || !token) return;
      void verifySession(token).then(({ status, profile }) => {
        if (cancelled) return;
        if (status === "invalid") {
          clearToken();
          setUser(null);
          return;
        }
        // Same round-trip also yields the GitHub profile (name, login, avatar)
        // that the JWT doesn't carry.
        if (status === "valid" && profile) {
          setUser({
            id: profile.userId,
            email: profile.email,
            name: profile.name,
            githubLogin: profile.githubLogin,
            avatarUrl: profile.avatarUrl,
          });
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const signIn = useCallback(() => {
    // Force GitHub's account picker when the last action was an explicit
    // sign-out, so the user isn't silently returned to the account they left.
    window.location.href = getGithubAuthUrl(consumeSignedOut());
  }, []);

  const signOut = useCallback(() => {
    markSignedOut();
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
