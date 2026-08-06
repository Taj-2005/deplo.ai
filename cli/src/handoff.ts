import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { hostname } from "node:os";
import { resolveWebUrl } from "./config";

/**
 * Browser hand-off for `deplo login`.
 *
 * Starts a loopback-only listener on a random port, opens
 * <web>/cli-auth?port=…&state=…&host=…, and waits for the page to redirect
 * back to 127.0.0.1:<port>/callback?token=dpl_…&state=…. The state nonce is
 * generated here and verified here — a response with the wrong nonce is
 * rejected. Times out after 5 minutes.
 */

const TIMEOUT_MS = 5 * 60_000;

const DONE_PAGE = `<!doctype html><meta charset="utf-8"><title>deplo — signed in</title>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#0a0a0a;color:#e6e6e6;font-family:ui-monospace,monospace">
<div style="text-align:center">
<div style="font-size:40px;color:#34d399">&#10003;</div>
<p style="font-size:15px">Signed in — return to your terminal.</p>
<p style="font-size:12px;color:#9ba1a6">You can close this tab.</p>
</div></body>`;

export interface HandoffResult {
  token: string;
}

export function buildHandoff(): {
  authUrl: (port: number) => string;
  state: string;
} {
  const state = randomBytes(16).toString("hex");
  return {
    state,
    authUrl: (port: number) =>
      `${resolveWebUrl()}/cli-auth?port=${port}&state=${state}&host=${encodeURIComponent(hostname())}`,
  };
}

export function listenForToken(state: string): Promise<{ port: number; result: Promise<HandoffResult> }> {
  return new Promise((resolveListener, rejectListener) => {
    const server = createServer();

    const result = new Promise<HandoffResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        server.close();
        reject(new Error("Timed out waiting for the browser (5 minutes). Try `deplo login --token` instead."));
      }, TIMEOUT_MS);

      server.on("request", (req, res) => {
        const url = new URL(req.url ?? "/", "http://127.0.0.1");
        if (url.pathname !== "/callback") {
          res.writeHead(404).end();
          return;
        }
        const token = url.searchParams.get("token") ?? "";
        const gotState = url.searchParams.get("state") ?? "";
        if (gotState !== state || !token.startsWith("dpl_")) {
          res.writeHead(400, { "Content-Type": "text/plain" }).end("Invalid hand-off state.");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(DONE_PAGE);
        clearTimeout(timer);
        // Give the response a beat to flush before closing the server.
        setTimeout(() => server.close(), 200);
        resolve({ token });
      });
    });

    server.on("error", rejectListener);
    // Loopback only — never reachable from the network.
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        rejectListener(new Error("Could not open a loopback port"));
        return;
      }
      resolveListener({ port: address.port, result });
    });
  });
}

/** Open a URL in the default browser, cross-platform, best-effort. */
export function openInBrowser(url: string): boolean {
  try {
    // Lazy import keeps startup fast.
    const { spawn } = require("node:child_process") as typeof import("node:child_process");
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.unref();
    return true;
  } catch {
    return false;
  }
}
