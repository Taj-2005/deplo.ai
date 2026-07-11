import { ImageResponse } from "next/og";

/**
 * Open Graph image (1200×630) — rendered at build/request time by Satori.
 * This is what WhatsApp, iMessage, Slack, X, LinkedIn etc. show when the
 * site URL is shared. File-convention metadata overrides layout.tsx config.
 */

export const runtime = "edge";
export const alt = "deplo.ai — Code goes in. Production URL comes out.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 70% -10%, rgba(0,210,255,0.16), transparent), radial-gradient(ellipse 60% 50% at 10% 110%, rgba(121,40,202,0.18), transparent), radial-gradient(circle at 1px 1px, #1c1c1c 1px, transparent 0)",
          backgroundSize: "100% 100%, 100% 100%, 28px 28px",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top — wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "linear-gradient(135deg, #00d2ff, #7928ca)",
              color: "#ffffff",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            ▲
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff", letterSpacing: -1 }}>
            deplo.ai
          </div>
        </div>

        {/* Middle — headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 76,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: -3,
              lineHeight: 1.05,
            }}
          >
            <span>Code goes in.</span>
            <span
              style={{
                backgroundImage: "linear-gradient(90deg, #00d2ff, #7928ca)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Production URL comes out.
            </span>
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "#9ba1a6", letterSpacing: -0.5 }}>
            AI-powered deployments — GitHub in, live URLs out in under 3 minutes.
          </div>
        </div>

        {/* Bottom — terminal strip + domain */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              backgroundColor: "#111111",
              border: "1px solid #262626",
              borderRadius: 12,
              padding: "16px 24px",
              fontSize: 24,
            }}
          >
            <span style={{ color: "#00d2ff" }}>$</span>
            <span style={{ color: "#e6e6e6" }}>git push</span>
            <span style={{ color: "#555555" }}>→</span>
            <span style={{ color: "#34d399" }}>https://your-app.vercel.app</span>
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 6, backgroundColor: "#34d399" }} />
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#6b7075" }}>www.deplo.in</div>
        </div>
      </div>
    ),
    size,
  );
}
