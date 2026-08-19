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

export function getGithubAuthUrl(forceAccountPicker = false): string {
  // Same-origin — the Next.js rewrite proxies this to the backend, which
  // 302-redirects the browser to GitHub. Keeps the user on the frontend domain.
  const base = `${getApiBaseUrl()}/api/v1/auth/github`;
  return forceAccountPicker ? `${base}?prompt=select_account` : base;
}

const SIGNED_OUT_KEY = "deplo_signed_out";

/**
 * Remember that the user signed out deliberately.
 *
 * GitHub re-authorizes silently when the app is already approved and the
 * github.com session is alive, so the next sign-in would drop them back into
 * the account they just left without a single prompt. This flag makes that one
 * sign-in force GitHub's account picker instead.
 */
export function markSignedOut(): void {
  try {
    localStorage.setItem(SIGNED_OUT_KEY, "1");
  } catch {
    // Private mode with storage denied — the picker just won't be forced.
  }
}

/** Reads and clears the flag: the picker is forced once, not forever. */
export function consumeSignedOut(): boolean {
  try {
    const had = localStorage.getItem(SIGNED_OUT_KEY) === "1";
    if (had) localStorage.removeItem(SIGNED_OUT_KEY);
    return had;
  } catch {
    return false;
  }
}

/**
 * Ask the server whether this token is still valid.
 *
 * A JWT decoded in the browser only proves it hasn't *expired* — not that the
 * account still exists, that the signing secret hasn't rotated, or that the
 * session wasn't ended elsewhere. Only the server knows that.
 *
 * Returns "valid" | "invalid" | "unknown". "unknown" covers network failures
 * and 5xx — including a cold-starting Render backend — and must NOT sign the
 * user out, or every slow start would eject them.
 */
export interface ServerProfile {
  userId: string;
  email: string;
  name: string;
  githubLogin: string;
  avatarUrl: string | null;
}

export async function verifySession(
  token: string,
): Promise<{ status: "valid" | "invalid" | "unknown"; profile?: ServerProfile }> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const profile = (await res.json()) as ServerProfile;
      return { status: "valid", profile };
    }
    if (res.status === 401 || res.status === 403) return { status: "invalid" };
    return { status: "unknown" };
  } catch {
    return { status: "unknown" };
  }
}
