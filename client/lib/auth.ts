const TOKEN_KEY = "deplo_token";

/** Base URL for API calls from the browser. */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  // Same-origin — proxied to the server via next.config rewrites
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:4000";
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
  const base = getApiBaseUrl();
  return base
    ? `${base}/api/v1/auth/github`
    : "/api/v1/auth/github";
}
