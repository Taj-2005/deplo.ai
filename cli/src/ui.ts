import pc from "picocolors";

/**
 * Terminal output helpers. Color is state, not decoration:
 * green = live, red = failed, cyan = URLs/actions, violet = AI content.
 * picocolors already respects NO_COLOR and non-TTY output.
 */

export const glyph = {
  ok: pc.green("✓"),
  fail: pc.red("✗"),
  arrow: pc.dim("→"),
  dot: pc.green("●"),
  question: pc.cyan("?"),
};

export const url = (u: string): string => pc.cyan(u);
export const dim = (s: string): string => pc.dim(s);
export const bold = (s: string): string => pc.bold(s);
export const red = (s: string): string => pc.red(s);
export const green = (s: string): string => pc.green(s);
export const violet = (s: string): string => pc.magenta(s);
export const cyan = (s: string): string => pc.cyan(s);

export function ok(message: string): void {
  console.log(`${glyph.ok} ${message}`);
}

export function fail(message: string): void {
  console.error(`${glyph.fail} ${message}`);
}

export function step(message: string): void {
  console.log(`${glyph.arrow} ${message}`);
}

export function hint(message: string): void {
  console.log(pc.dim(`  ${message}`));
}

/** mm:ss for the "Deployed in 2:41" line. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Status → colored label used by status/list output. */
export function statusLabel(status: string): string {
  switch (status) {
    case "COMPLETED":
      return pc.green("● live");
    case "FAILED":
      return pc.red("✗ failed");
    case "CANCELLED":
      return pc.dim("○ cancelled");
    case "WAITING_FOR_ENV":
      return pc.yellow("◐ waiting for env");
    default:
      return pc.yellow(`◌ ${status.toLowerCase().replace(/_/g, " ")}`);
  }
}
