import type { Request, Response } from "express";
import { z } from "zod";
import type { IUserRepository } from "../../../domain/user/UserRepository.interface";
import type { SmtpMailer } from "../../../infrastructure/email/SmtpMailer";
import { buildFeedbackEmail, type FeedbackType } from "../../../application/notifications/feedbackTemplate";
import { AppError } from "../../../shared/errors/AppError";
import { env } from "../../../config/env";
import { logger } from "../../../shared/logger/logger";

const FeedbackSchema = z.object({
  type: z.enum(["BUG", "IDEA", "OTHER"]),
  message: z.string().trim().min(10).max(5_000),
  steps: z.string().trim().max(5_000).optional(),
  context: z.object({
    path: z.string().max(512).default("/"),
    userAgent: z.string().max(512).default(""),
    viewport: z.string().max(32).default(""),
    appVersion: z.string().max(32).default(""),
    occurredAt: z.string().max(64).default(""),
    deploymentId: z.string().max(64).optional(),
  }),
});

/**
 * POST /feedback — in-app feedback and bug reports (authenticated).
 *
 * Identity comes from the session, never the request body, so reports are
 * always attributable. The mail is sent from the platform address with
 * Reply-To set to the reporter, so replying reaches them directly.
 */
export class FeedbackController {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly mailer: SmtpMailer,
  ) {}

  submit = async (req: Request, res: Response): Promise<void> => {
    const parsed = FeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: "Invalid feedback", details: parsed.error.flatten() } });
      return;
    }

    const user = await this.userRepository.findById(req.userId!);
    if (!user) throw AppError.unauthorized();

    const recipient = env.FEEDBACK_TO ?? env.SMTP_USER;
    if (!this.mailer.isConfigured() || !recipient) {
      logger.warn("Feedback received but mail is not configured", { userId: user.id, type: parsed.data.type });
      throw AppError.internal("Feedback can't be delivered right now — please email support@deplo.in");
    }

    // GitHub's privacy-mode addresses can't receive replies; don't set Reply-To
    // to an address that would bounce.
    const replyable = !user.email.endsWith("@github.local") && !user.email.endsWith("users.noreply.github.com");

    const mail = buildFeedbackEmail({
      appUrl: env.ALLOWED_ORIGINS[0] ?? "https://www.deplo.in",
      type: parsed.data.type as FeedbackType,
      message: parsed.data.message,
      steps: parsed.data.steps,
      context: parsed.data.context,
      user: { id: user.id, name: user.name, email: user.email, githubLogin: user.githubLogin },
    });

    await this.mailer.send({
      to: recipient,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(replyable ? { replyTo: `${user.name} <${user.email}>` } : {}),
    });

    logger.info("Feedback submitted", { userId: user.id, type: parsed.data.type, path: parsed.data.context.path });
    res.status(202).json({ received: true });
  };
}
