import type { AiFailureDiagnosis } from "../../domain/analysis/types";
import type { SmtpMailer } from "../../infrastructure/email/SmtpMailer";
import { env } from "../../config/env";
import { logger } from "../../shared/logger/logger";
import {
  buildAwaitingEnvEmail,
  buildFailureEmail,
  buildSuccessEmail,
  type DeploymentMailContext,
} from "./emailTemplates";

interface DeploymentRef {
  deploymentId: string;
  repoFullName: string;
  branch: string;
  userEmail: string;
}

/**
 * Sends deployment lifecycle emails. Every method is best-effort: failures are
 * logged and swallowed — notifications must never affect a deployment.
 * Users with no real email (GitHub privacy fallback `@github.local`) are
 * skipped silently.
 */
export class DeploymentEmailService {
  constructor(private readonly mailer: SmtpMailer) {}

  private ctx(ref: DeploymentRef): DeploymentMailContext {
    return {
      appUrl: env.ALLOWED_ORIGINS[0] ?? "https://www.deplo.in",
      deploymentId: ref.deploymentId,
      repoFullName: ref.repoFullName,
      branch: ref.branch,
      when: new Date(),
    };
  }

  private deliverable(ref: DeploymentRef): boolean {
    if (!this.mailer.isConfigured()) return false;
    if (!ref.userEmail || ref.userEmail.endsWith("@github.local")) {
      logger.debug("No deliverable email for user — skipping notification", { deploymentId: ref.deploymentId });
      return false;
    }
    return true;
  }

  async sendFailure(ref: DeploymentRef, errorMessage: string, diagnosis: AiFailureDiagnosis | null): Promise<void> {
    try {
      if (!this.deliverable(ref)) return;
      const mail = buildFailureEmail({ ctx: this.ctx(ref), errorMessage, diagnosis });
      await this.mailer.send({ to: ref.userEmail, ...mail });
    } catch (err) {
      logger.warn("Failed to send failure email", { deploymentId: ref.deploymentId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  async sendSuccess(ref: DeploymentRef, frontendUrl: string | null, backendUrl: string | null): Promise<void> {
    try {
      if (!this.deliverable(ref)) return;
      const mail = buildSuccessEmail({ ctx: this.ctx(ref), frontendUrl, backendUrl });
      await this.mailer.send({ to: ref.userEmail, ...mail });
    } catch (err) {
      logger.warn("Failed to send success email", { deploymentId: ref.deploymentId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  async sendAwaitingEnv(ref: DeploymentRef, missingKeys: string[]): Promise<void> {
    try {
      if (!this.deliverable(ref) || missingKeys.length === 0) return;
      const mail = buildAwaitingEnvEmail({ ctx: this.ctx(ref), missingKeys });
      await this.mailer.send({ to: ref.userEmail, ...mail });
    } catch (err) {
      logger.warn("Failed to send awaiting-env email", { deploymentId: ref.deploymentId, error: err instanceof Error ? err.message : String(err) });
    }
  }
}
