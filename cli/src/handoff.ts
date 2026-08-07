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

// Success page shown in the browser after the hand-off lands. The icon is
// lucide's circle-check-big, stroke-animated, with a confetti burst — all
// inline, no external requests, honors prefers-reduced-motion.
const DONE_PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>deplo — signed in</title>
<style>
  body{margin:0;display:grid;place-items:center;min-height:100vh;background:#0a0a0a;color:#e6e6e6;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden}
  .wrap{text-align:center;animation:rise .5s ease both}
  svg{width:88px;height:88px;stroke:#34d399;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .ring{stroke-dasharray:64;stroke-dashoffset:64;animation:draw .55s ease-out forwards}
  .check{stroke-dasharray:22;stroke-dashoffset:22;animation:draw .4s ease-out .45s forwards}
  p{font-size:15px;margin:14px 0 0}
  .dim{font-size:12px;color:#9ba1a6;margin-top:6px}
  .c{position:fixed;top:-14px;width:7px;height:11px;opacity:.9;animation:fall linear forwards}
  @keyframes draw{to{stroke-dashoffset:0}}
  @keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @keyframes fall{to{transform:translateY(105vh) rotate(720deg);opacity:.6}}
  @media (prefers-reduced-motion:reduce){.ring,.check{animation:none;stroke-dashoffset:0}.wrap{animation:none}.c{display:none}}
</style></head>
<body>
<div class="wrap">
<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ring" d="M21.801 10A10 10 0 1 1 17 3.335"/><path class="check" d="m9 11 3 3L22 4"/></svg>
<p>Signed in &mdash; return to your terminal.</p>
<p class="dim">You can close this tab.</p>
</div>
<script>
(function(){
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var colors=["#00d2ff","#7928ca","#34d399","#fbbf24"];
  for (var i=0;i<70;i++){
    var d=document.createElement("div");
    d.className="c";
    d.style.left=(Math.random()*100)+"vw";
    d.style.background=colors[i%colors.length];
    d.style.transform="rotate("+(Math.random()*360)+"deg)";
    d.style.animationDuration=(2.2+Math.random()*1.8)+"s";
    d.style.animationDelay=(.5+Math.random()*.6)+"s";
    document.body.appendChild(d);
  }
})();
</script>
</body></html>`;

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
