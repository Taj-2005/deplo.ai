/**
 * Single source of truth for user-visible version and copyright strings.
 *
 * Keep APP_VERSION in step with client/package.json — it is the platform
 * version shown in the dashboard, onboarding, and settings footers (the CLI
 * ships its own version in @deplo.ai/cli).
 */
export const APP_VERSION = "0.1.0";

/**
 * Evaluated once at module load rather than during render — Date.now() inside
 * a component body violates react-hooks/purity. Elements printing this should
 * carry suppressHydrationWarning: a page prerendered in December and viewed in
 * January would otherwise mismatch on the year alone.
 */
export const CURRENT_YEAR = new Date().getFullYear();

/** Year of first publication — also the `foundingDate` in the JSON-LD. */
export const FOUNDED_YEAR = 2026;

/**
 * Copyright convention is first-publication year, not the current year, so the
 * notice widens into a range instead of resetting each January. Collapses to a
 * single year while the two are equal.
 */
export const COPYRIGHT_YEARS =
  FOUNDED_YEAR === CURRENT_YEAR ? `${CURRENT_YEAR}` : `${FOUNDED_YEAR}–${CURRENT_YEAR}`;
