import {
  AI_ESCALATION_THRESHOLD,
  type FrameworkCandidate,
  type FrameworkKind,
} from "../../domain/analysis/types";
import { FRAMEWORK_PRIORITY } from "./frameworkSignatures";

/** A framework we return when nothing matched at all. */
export const UNKNOWN_CANDIDATE: FrameworkCandidate = {
  framework: "unknown",
  kind: "unknown",
  language: "unknown",
  score: 0,
  confidence: 0,
  evidence: [],
};

/**
 * ConfidenceEvaluator turns a set of scored candidates into a single decision:
 * which framework is primary, and whether deterministic confidence is high
 * enough or the pipeline should escalate to AI reasoning.
 */
export class ConfidenceEvaluator {
  constructor(private readonly threshold: number = AI_ESCALATION_THRESHOLD) {}

  /**
   * Choose the primary candidate from a list, optionally restricted to a kind.
   * Confident candidates (>= threshold) win by framework priority so that a
   * meta-framework (Next.js) beats the base library (React) it is built on.
   * If none are confident, the single highest-scored candidate is returned.
   */
  selectPrimary(candidates: FrameworkCandidate[], kind?: FrameworkKind): FrameworkCandidate | null {
    const pool = kind ? candidates.filter((c) => c.kind === kind) : candidates;
    if (pool.length === 0) return null;

    const confident = pool.filter((c) => c.confidence >= this.threshold);
    if (confident.length > 0) {
      return [...confident].sort(
        (a, b) => FRAMEWORK_PRIORITY[b.framework] - FRAMEWORK_PRIORITY[a.framework] || b.confidence - a.confidence,
      )[0]!;
    }
    return [...pool].sort((a, b) => b.confidence - a.confidence || b.score - a.score)[0]!;
  }

  isConfident(candidate: FrameworkCandidate | null): boolean {
    return candidate !== null && candidate.confidence >= this.threshold;
  }

  /** Overall confidence = the weakest confident signal across components. */
  overall(primaries: Array<FrameworkCandidate | null>): number {
    const present = primaries.filter((c): c is FrameworkCandidate => c !== null);
    if (present.length === 0) return 0;
    return Math.min(...present.map((c) => c.confidence));
  }

  needsFallback(primaries: Array<FrameworkCandidate | null>): boolean {
    const present = primaries.filter((c): c is FrameworkCandidate => c !== null);
    if (present.length === 0) return true;
    return present.some((c) => c.confidence < this.threshold);
  }
}
