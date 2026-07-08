const TOKEN_KEY = "deplo_token";

/**
 * Base URL for API calls.
 *
 * The frontend is intentionally environment-independent: the browser ALWAYS
 * talks to its own origin (`/api/...`), and Next.js rewrites transparently
 * proxy those requests to the backend (see next.config.ts). The browser never
 * communicates with the Render URL directly.
 *
 * Only server-side rendering (which has no same-origin proxy) targets the
 * backend directly via the server-only `API_URL`.
 */
export function getApiBaseUrl(): string {
  // Browser → same-origin; proxied to the backend by next.config rewrites.
  if (typeof window !== "undefined") return "";
  // Server-side (SSR / build) → hit the backend origin directly.
  return (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface TokenPayload {
  sub: string;
  email: string;
  exp: number;
  iat: number;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(atob(part)) as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenValid(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return false;
  return decoded.exp * 1000 > Date.now();
}

export function getGithubAuthUrl(): string {
  // Same-origin — the Next.js rewrite proxies this to the backend, which
  // 302-redirects the browser to GitHub. Keeps the user on the frontend domain.
  return `${getApiBaseUrl()}/api/v1/auth/github`;
}
