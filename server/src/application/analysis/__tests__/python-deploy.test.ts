import { RepositoryAnalyzer } from "../RepositoryAnalyzer";
import { RepoSnapshot, type ISourceProvider, type RepoBlob } from "../ports";
import { toDetectedStack } from "../legacyMapper";
import type { RepositoryAnalysis } from "../../../domain/analysis/types";

class FakeSource implements ISourceProvider {
  constructor(private readonly files: Record<string, string>) {}
  async getTree(): Promise<RepoBlob[]> {
    return Object.entries(this.files).map(([path, content]) => ({ path, size: content.length }));
  }
  async readFile(path: string): Promise<string | null> {
    return this.files[path] ?? null;
  }
}

function analyze(files: Record<string, string>): Promise<RepositoryAnalysis> {
  return new RepositoryAnalyzer(new RepoSnapshot(new FakeSource(files))).analyze();
}

describe("Python backends (Phase 3, slice 1)", () => {
  it("FastAPI: detects the real app module and variable for uvicorn", async () => {
    const result = await analyze({
      "requirements.txt": "fastapi==0.110\nuvicorn==0.29",
      "api.py": "from fastapi import FastAPI\nserver = FastAPI()",
    });
    const backend = result.components.find((c) => c.role === "backend")!;
    expect(backend.framework.framework).toBe("fastapi");
    expect(backend.strategy.deployable).toBe(true);
    expect(backend.strategy.provider).toBe("render");
    expect(backend.strategy.startCommand).toBe("uvicorn api:server --host 0.0.0.0 --port $PORT");
    expect(backend.strategy.installCommand).toBe("pip install -r requirements.txt");
  });

  it("Flask: unconventional module name (application.py) resolves correctly", async () => {
    const result = await analyze({
      "requirements.txt": "flask==3.0\ngunicorn==22.0",
      "application.py": "from flask import Flask\napplication = Flask(__name__)",
    });
    const backend = result.components.find((c) => c.role === "backend")!;
    expect(backend.framework.framework).toBe("flask");
    expect(backend.strategy.startCommand).toBe("gunicorn --bind 0.0.0.0:$PORT application:application");
  });

  it("Django: finds the project wsgi package for gunicorn", async () => {
    const result = await analyze({
      "requirements.txt": "django==5.0\ngunicorn==22.0",
      "manage.py": "import django",
      "mysite/wsgi.py": "application = get_wsgi_application()",
      "mysite/settings.py": "DEBUG = False",
    });
    const backend = result.components.find((c) => c.role === "backend")!;
    expect(backend.framework.framework).toBe("django");
    expect(backend.strategy.startCommand).toBe("gunicorn --bind 0.0.0.0:$PORT mysite.wsgi:application");
    expect(backend.strategy.deployable).toBe(true);
  });

  it("legacy stack carries python runtime info for the orchestrator", async () => {
    const result = await analyze({
      "requirements.txt": "fastapi==0.110\nuvicorn==0.29",
      "main.py": "from fastapi import FastAPI\napp = FastAPI()",
      ".python-version": "3.12.1",
    });
    const stack = toDetectedStack(result);
    expect(stack.backend).toBe("FASTAPI");

    // The orchestrator's fields are set by AnalysisService from the component;
    // simulate that mapping here.
    const backend = result.components.find((c) => c.role === "backend")!;
    expect(backend.framework.language).toBe("python");
    expect(backend.strategy.runtime.version).toBe("3.12.1");
    expect(backend.strategy.startCommand).toContain("uvicorn main:app");
  });

  it("monorepo: python backend in a subdirectory keeps working", async () => {
    const result = await analyze({
      "client/package.json": JSON.stringify({ dependencies: { react: "18" }, devDependencies: { vite: "5" }, scripts: { build: "vite build" } }),
      "client/vite.config.ts": "export default {}",
      "server/requirements.txt": "flask==3.0",
      "server/app.py": "from flask import Flask\napp = Flask(__name__)",
    });
    const backend = result.components.find((c) => c.role === "backend")!;
    expect(backend.path).toBe("server");
    expect(backend.framework.framework).toBe("flask");
    expect(backend.strategy.startCommand).toBe("gunicorn --bind 0.0.0.0:$PORT app:app");
    const stack = toDetectedStack(result);
    expect(stack.backend).toBe("FLASK");
    expect(stack.backendPath).toBe("server");
    expect(stack.frontend).toBe("REACT_VITE");
  });
});

describe("Go backends (Phase 3, slice 3)", () => {
  it("cmd/<name> layout builds the right package", async () => {
    const result = await analyze({
      "go.mod": "module example.com/svc\n\ngo 1.22\n",
      "cmd/server/main.go": "package main\nfunc main() {}",
      "internal/handler/handler.go": "package handler",
    });
    const backend = result.components.find((c) => c.role === "backend")!;
    expect(backend.framework.framework).toBe("go");
    expect(backend.strategy.buildCommand).toBe("go build -o app ./cmd/server");
    expect(backend.strategy.startCommand).toBe("./app");
    expect(backend.strategy.deployable).toBe(true);
    expect(toDetectedStack(result).backend).toBe("GO");
  });

  it("go version flows from go.mod for the runtime", async () => {
    const result = await analyze({
      "go.mod": "module example.com/app\n\ngo 1.22\n",
      "main.go": "package main\nfunc main() {}",
    });
    const backend = result.components.find((c) => c.role === "backend")!;
    expect(backend.strategy.runtime.version).toBe("1.22");
    expect(backend.framework.language).toBe("go");
  });
});
