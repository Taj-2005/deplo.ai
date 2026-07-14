import { EnvVarScanner, defaultFrontendApiKeys, extractEnvRefs } from "../EnvVarScanner";
import { RepoSnapshot, type ISourceProvider, type RepoBlob } from "../ports";

class FakeSource implements ISourceProvider {
  constructor(private readonly files: Record<string, string>) {}
  async getTree(): Promise<RepoBlob[]> {
    return Object.entries(this.files).map(([path, content]) => ({ path, size: content.length }));
  }
  async readFile(path: string): Promise<string | null> {
    return this.files[path] ?? null;
  }
}

function scan(files: Record<string, string>, components: Array<{ path: string; role: "frontend" | "backend" }>) {
  return new EnvVarScanner(new RepoSnapshot(new FakeSource(files))).scan(components);
}

describe("extractEnvRefs", () => {
  it("finds dot, bracket, destructured, import.meta and python refs", () => {
    const refs = extractEnvRefs(`
      const url = process.env.DATABASE_URL;
      const key = process.env["STRIPE_KEY"];
      const { JWT_SECRET, REDIS_URL: redis, SMTP_PORT = "587" } = process.env;
      const api = import.meta.env.VITE_SOME_FLAG;
      token = os.getenv("BOT_TOKEN")
      secret = os.environ["DJANGO_SECRET"]
      cfg = os.environ.get("CACHE_TTL")
    `);
    for (const k of ["DATABASE_URL", "STRIPE_KEY", "JWT_SECRET", "REDIS_URL", "SMTP_PORT", "VITE_SOME_FLAG", "BOT_TOKEN", "DJANGO_SECRET", "CACHE_TTL"]) {
      expect([...refs]).toContain(k);
    }
  });
});

describe("EnvVarScanner", () => {
  it("finds vars in ANY source file — no fixed filename list, no .env.example needed", async () => {
    const { vars } = await scan(
      {
        "src/db/connection.js": "mongoose.connect(process.env.MONGO_URI)",
        "src/services/mailer.ts": "const { SMTP_HOST, SMTP_PASS } = process.env;",
        "lib/stripe.js": 'const stripe = Stripe(process.env["STRIPE_SECRET"]);',
      },
      [{ path: "", role: "backend" }],
    );
    const keys = vars.map((v) => v.key);
    expect(keys).toEqual(expect.arrayContaining(["MONGO_URI", "SMTP_HOST", "SMTP_PASS", "STRIPE_SECRET"]));
    expect(vars.every((v) => v.scope === "backend")).toBe(true);
  });

  it("scopes vars by component directory and marks cross-side vars shared", async () => {
    const { vars } = await scan(
      {
        "client/src/main.tsx": "fetch(import.meta.env.VITE_ANALYTICS_ID); const x = process.env.SENTRY_DSN;",
        "server/src/index.js": "const { DATABASE_URL } = process.env; const y = process.env.SENTRY_DSN;",
      },
      [
        { path: "client", role: "frontend" },
        { path: "server", role: "backend" },
      ],
    );
    const byKey = Object.fromEntries(vars.map((v) => [v.key, v]));
    expect(byKey["VITE_ANALYTICS_ID"]!.scope).toBe("frontend");
    expect(byKey["DATABASE_URL"]!.scope).toBe("backend");
    expect(byKey["SENTRY_DSN"]!.scope).toBe("shared");
  });

  it("detects frontend backend-URL keys for auto-injection instead of asking the user", async () => {
    const { vars, frontendApiKeys } = await scan(
      {
        "client/src/api.ts": "const base = import.meta.env.VITE_API_URL; const k = import.meta.env.VITE_MAPS_KEY;",
      },
      [{ path: "client", role: "frontend" }],
    );
    expect(frontendApiKeys).toContain("VITE_API_URL");
    expect(vars.map((v) => v.key)).not.toContain("VITE_API_URL"); // auto-injected, not asked
    expect(vars.map((v) => v.key)).toContain("VITE_MAPS_KEY"); // real user var still asked
  });

  it("takes defaults from example env files but never values from real .env files", async () => {
    const { vars } = await scan(
      {
        ".env.example": "LOG_LEVEL=info\nAPI_TIMEOUT=",
        "config/.env": "SUPER_SECRET=real-password-123",
        "src/index.js": "process.env.LOG_LEVEL; process.env.SUPER_SECRET;",
      },
      [{ path: "", role: "backend" }],
    );
    const byKey = Object.fromEntries(vars.map((v) => [v.key, v]));
    expect(byKey["LOG_LEVEL"]!.value).toBe("info"); // example default kept
    expect(byKey["API_TIMEOUT"]!.isRequired).toBe(true); // empty in example → required
    expect(byKey["SUPER_SECRET"]!.value).toBe(""); // real .env value never reused
  });

  it("excludes platform-managed vars and skips node_modules/dist/test files", async () => {
    const { vars } = await scan(
      {
        "src/server.js": "app.listen(process.env.PORT); process.env.NODE_ENV; process.env.MY_REAL_VAR;",
        "node_modules/pkg/index.js": "process.env.FAKE_FROM_DEP",
        "dist/bundle.js": "process.env.FAKE_FROM_BUILD",
        "src/server.test.js": "process.env.FAKE_FROM_TEST",
      },
      [{ path: "", role: "backend" }],
    );
    const keys = vars.map((v) => v.key);
    expect(keys).toEqual(["MY_REAL_VAR"]);
  });

  it("framework defaults cover the wiring key even when code doesn't reference it yet", () => {
    expect(defaultFrontendApiKeys("NEXTJS")).toEqual(["NEXT_PUBLIC_API_URL"]);
    expect(defaultFrontendApiKeys("REACT_VITE")).toEqual(["VITE_API_URL"]);
    expect(defaultFrontendApiKeys("EXPRESS")).toEqual([]);
  });
});
