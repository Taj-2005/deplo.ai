import pc from "picocolors";

/**
 * Success celebration for `deplo deploy` — a terminal rendition of lucide's
 * circle-check-big: the ring appears, the check strokes in, confetti bursts.
 *
 * Runs ONLY on an interactive TTY without NO_COLOR/CI set; everywhere else
 * (pipes, CI logs) it's a silent no-op and the plain ✓ lines carry the news.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The ring, lucide circle-check-big proportions. Check cells are applied on top.
const RING = [
  "    ╭──────╮    ",
  "   ╱        ╲   ",
  "  │          │  ",
  "  │          │  ",
  "   ╲        ╱   ",
  "    ╰──────╯    ",
];

// Check mark in two strokes: down-left first, then the long up-right stroke.
const CHECK_STROKES: Array<Array<[row: number, col: number, ch: string]>> = [
  [
    [3, 6, "╲"],
    [4, 7, "╲"],
  ],
  [
    [4, 8, "╱"],
    [3, 9, "╱"],
    [2, 10, "╱"],
  ],
];

const CANVAS_WIDTH = 34;
const CONFETTI_CHARS = ["✦", "•", "▪", "*", "˚", "·"];
const CONFETTI_COLORS = [pc.cyan, pc.magenta, pc.green, pc.yellow];

interface Particle {
  row: number;
  col: number;
  ch: string;
  paint: (s: string) => string;
}

function randomParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    // Left and right bands beside the ring, plus the corners above/below it.
    const side = Math.random() < 0.5;
    particles.push({
      row: Math.floor(Math.random() * RING.length),
      col: side
        ? 17 + Math.floor(Math.random() * (CANVAS_WIDTH - 17))
        : Math.floor(Math.random() * 3),
      ch: CONFETTI_CHARS[Math.floor(Math.random() * CONFETTI_CHARS.length)] ?? "•",
      paint: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? pc.cyan,
    });
  }
  return particles;
}

function buildFrame(strokes: number, particles: Particle[]): string[] {
  // Plain char grid first, colors applied per cell at the end.
  const grid = RING.map((row) => row.padEnd(CANVAS_WIDTH).split(""));
  const checkCells = new Set<string>();
  for (const stroke of CHECK_STROKES.slice(0, strokes)) {
    for (const [row, col, ch] of stroke) {
      const line = grid[row];
      if (line) line[col] = ch;
      checkCells.add(`${row}:${col}`);
    }
  }

  const particleAt = new Map<string, Particle>();
  for (const p of particles) {
    const line = grid[p.row];
    if (line && line[p.col] === " ") {
      line[p.col] = p.ch;
      particleAt.set(`${p.row}:${p.col}`, p);
    }
  }

  return grid.map((row, r) =>
    row
      .map((ch, c) => {
        if (ch === " ") return ch;
        const key = `${r}:${c}`;
        const particle = particleAt.get(key);
        if (particle) return particle.paint(ch);
        if (checkCells.has(key)) return pc.bold(pc.green(ch));
        return pc.green(ch);
      })
      .join(""),
  );
}

function paintFrame(lines: string[], first: boolean): void {
  const up = first ? "" : `\x1b[${lines.length}A`;
  process.stdout.write(up + lines.map((l) => `\x1b[2K${l}`).join("\n") + "\n");
}

export async function celebrateDeployed(): Promise<void> {
  if (!process.stdout.isTTY || process.env["NO_COLOR"] || process.env["CI"]) {
    return;
  }
  process.stdout.write("\x1b[?25l"); // hide cursor
  try {
    // Ring appears, then the check strokes in.
    paintFrame(buildFrame(0, []), true);
    await sleep(140);
    paintFrame(buildFrame(1, []), false);
    await sleep(140);
    paintFrame(buildFrame(2, []), false);
    await sleep(180);

    // Confetti burst — dense, then thinning out.
    for (const count of [16, 16, 12, 10, 7, 5, 3]) {
      paintFrame(buildFrame(2, randomParticles(count)), false);
      await sleep(90);
    }

    // Settle on the clean circle-check.
    paintFrame(buildFrame(2, []), false);
  } finally {
    process.stdout.write("\x1b[?25h"); // show cursor
  }
}
