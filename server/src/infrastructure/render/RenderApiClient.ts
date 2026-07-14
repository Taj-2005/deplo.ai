import { AppError } from "../../shared/errors/AppError";

const RENDER_API_BASE = "https://api.render.com/v1";
const REQUEST_TIMEOUT_MS = 15_000;

export interface RenderOwner {
  id: string;
  name: string;
  email: string | null;
  type: "user" | "team";
}

/**
 * Lightweight, per-user Render API client used by the integration layer.
 * Bound to a single user's Personal API Key — never a global platform key.
 * The key is held in memory only; it is never logged or returned.
 */
export class RenderApiClient {
  constructor(private readonly apiKey: string) {}

  /**
   * Validate the API key with the cheapest authenticated call — List Owners
   * (workspaces). Returns the owners the key can access.
   * Throws AppError.unauthorized for invalid/revoked keys.
   */
  async listOwners(): Promise<RenderOwner[]> {
    const res = await this.request<Array<{ owner: RenderOwner }>>("GET", "/owners?limit=20");
    return res.map((r) => r.owner);
  }

  private async request<T>(method: string, path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${RENDER_API_BASE}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
      });

      if (res.status === 401 || res.status === 403) {
        throw AppError.unauthorized("Invalid Render API key. Check the key and try again.");
      }
      if (res.status === 429) {
        throw AppError.externalService("Render", "Rate limited — please try again in a moment.");
      }
      if (!res.ok) {
        // Never include the request/key in errors — body only.
        const text = await res.text().catch(() => "");
        throw AppError.externalService("Render", `${res.status}: ${text.slice(0, 300)}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw AppError.externalService("Render", "API request timed out. Please try again.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
