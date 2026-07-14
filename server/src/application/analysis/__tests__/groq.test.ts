import { GroqClient } from "../../../infrastructure/groq/GroqClient";
import { GroqReasoningService, normalizeFramework, normalizeLanguage } from "../GroqReasoningService";
import { RepositoryAnalyzer } from "../RepositoryAnalyzer";
import { RepoSnapshot, type ILlmClient, type ISourceProvider, type RepoBlob } from "../ports";
import { toDetectedStack } from "../legacyMapper";
import type { AiFailureDiagnosis, AiRepoReasoning } from "../../../domain/analysis/types";

class FakeSource implements ISourceProvider {
  constructor(private readonly files: Record<string, string>) {}
  async getTree(): Promise<RepoBlob[]> {
    return Object.entries(this.files).map(([path, content]) => ({ path, size: content.length }));
  }
  async readFile(path: string): Promise<string | null> {
    return this.files[path] ?? null;
  }
}

describe("GroqClient token failover", () => {
  const okResponse = (content: unknown): Response =>
    new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }], usage: { total_tokens: 10 } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  afterEach(() => jest.restoreAllMocks());

  it("falls back to the second key when the first is rejected", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(okResponse({ ok: true }));

    const client = new GroqClient(["key-1", "key-2"], "openai/gpt-oss-120b");
    const result = await client.completeJson<{ ok: boolean }>({
      system: "s", user: "u", schemaName: "t",
      schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false },
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondAuth = (fetchMock.mock.calls[1]![1]!.headers as Record<string, string>)["Authorization"];
    expect(secondAuth).toBe("Bearer key-2");
  });

  it("throws after all keys fail — bounded, one try per key", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("boom", { status: 500 }));

    const client = new GroqClient(["key-1", "key-2"], "m");
    await expect(
      client.completeJson({ system: "s", user: "u", schemaName: "t", schema: {} }),
    ).rejects.toThrow(/All 2 API key/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("requires at least one token", () => {
    expect(() => new GroqClient([undefined, ""], "m")).toThrow(/at least one/);
  });
});

describe("normalization", () => {
  it("maps free-text framework names onto FrameworkId", () => {
    expect(normalizeFramework("Next.js")).toBe("nextjs");
    expect(normalizeFramework("FastAPI")).toBe("fastapi");
    expect(normalizeFramework("Spring Boot")).toBe("spring-boot");
    expect(normalizeFramework("golang")).toBe("go");
    expect(normalizeFramework("something-else")).toBe("unknown");
  });
  it("maps languages", () => {
    expect(normalizeLanguage("TypeScript")).toBe("typescript");
    expect(normalizeLanguage("Python")).toBe("python");
    expect(normalizeLanguage("brainfuck")).toBe("unknown");
  });
});

describe("GroqReasoningService merge", () => {
  // A repo the deterministic engine can't identify: bare Python file, no manifest.
  const files = {
    "serve.py": "import http.server\n",
    "README.md": "# mystery app",
  };

  function llmReturning(reasoning: AiRepoReasoning): ILlmClient {
    return { completeJson: jest.fn().mockResolvedValue(reasoning) };
  }

  it("adopts the AI result when deterministic confidence is lower", async () => {
    const snapshot = new RepoSnapshot(new FakeSource(files));
    const deterministic = await new RepositoryAnalyzer(snapshot).analyze();
    expect(deterministic.needsAiFallback).toBe(true);

    const service = new GroqReasoningService(
      llmReturning({
        summary: "Bare Python HTTP server app.",
        components: [{
          path: "", role: "backend", framework: "Flask", language: "Python",
          installCommand: "pip install -r requirements.txt", buildCommand: null,
          outputDirectory: null, startCommand: "python serve.py",
          confidence: 0.8, reasoning: "serve.py uses http.server; closest supported runtime is python.", envVars: [],
        }],
      }),
    );

    const merged = await service.reasonAboutRepository(snapshot, deterministic);
    const backend = merged.components.find((c) => c.role === "backend")!;

    expect(merged.aiUsed).toBe(true);
    expect(merged.needsAiFallback).toBe(false);
    expect(backend.framework.framework).toBe("flask");
    expect(backend.framework.confidence).toBe(0.8);
    expect(backend.strategy.startCommand).toBe("python serve.py");
    expect(backend.framework.evidence.some((e) => e.signal === "ai:groq")).toBe(true);
  });

  it("keeps the deterministic result when the LLM call fails", async () => {
    const snapshot = new RepoSnapshot(new FakeSource(files));
    const deterministic = await new RepositoryAnalyzer(snapshot).analyze();

    const failing: ILlmClient = { completeJson: jest.fn().mockRejectedValue(new Error("down")) };
    const merged = await new GroqReasoningService(failing).reasonAboutRepository(snapshot, deterministic);

    expect(merged).toBe(deterministic);
    expect(merged.aiUsed).toBeUndefined();
  });

  it("does not let a less-confident AI overwrite a confident deterministic result", async () => {
    const confidentFiles = {
      "package.json": JSON.stringify({ dependencies: { next: "14" }, scripts: { build: "next build" } }),
      "next.config.ts": "export default {}",
    };
    const snapshot = new RepoSnapshot(new FakeSource(confidentFiles));
    const deterministic = await new RepositoryAnalyzer(snapshot).analyze();

    const service = new GroqReasoningService(
      llmReturning({
        summary: "wrong guess",
        components: [{
          path: "", role: "frontend", framework: "Gatsby", language: "JavaScript",
          installCommand: null, buildCommand: null, outputDirectory: null, startCommand: null,
          confidence: 0.4, reasoning: "low-confidence hallucination", envVars: [],
        }],
      }),
    );

    const merged = await service.reasonAboutRepository(snapshot, deterministic);
    expect(merged.components[0]!.framework.framework).toBe("nextjs");
  });

  it("produces a legacy stack from AI-corrected analysis", async () => {
    const snapshot = new RepoSnapshot(new FakeSource(files));
    const deterministic = await new RepositoryAnalyzer(snapshot).analyze();
    const service = new GroqReasoningService(
      llmReturning({
        summary: "express app",
        components: [{
          path: "", role: "backend", framework: "Express", language: "JavaScript",
          installCommand: "npm install", buildCommand: null, outputDirectory: null,
          startCommand: "node server.js", confidence: 0.9, reasoning: "r", envVars: [],
        }],
      }),
    );
    const merged = await service.reasonAboutRepository(snapshot, deterministic);
    expect(toDetectedStack(merged).backend).toBe("EXPRESS");
  });

  it("returns a structured failure diagnosis", async () => {
    const diagnosis: AiFailureDiagnosis = {
      likelyCause: "Build command wrong",
      frameworkMisidentified: false,
      correctedFramework: null,
      correctedBuildCommand: "pnpm build",
      correctedStartCommand: null,
      correctedOutputDirectory: null,
      recommendation: "Use pnpm because pnpm-lock.yaml is present.",
      confidence: 0.7,
    };
    const llm: ILlmClient = { completeJson: jest.fn().mockResolvedValue(diagnosis) };
    const result = await new GroqReasoningService(llm).diagnoseDeploymentFailure({
      errorMessage: "build failed",
      logs: ["npm run build", "missing lockfile"],
      analysis: null,
      stackSummary: "frontend=NEXTJS",
    });
    expect(result?.correctedBuildCommand).toBe("pnpm build");
  });
});
