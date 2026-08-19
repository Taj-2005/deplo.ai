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
 * Public submissions carry their own identity, so the fields the session
 * normally supplies are required here — and `company` is a honeypot: a real
 * person never sees it, so anything filling it in is a bot.
 */
const PublicFeedbackSchema = FeedbackSchema.extend({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(254),
  company: z.string().max(0).optional(),
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
      throw AppError.internal("Feedback can't be delivered right now — please email deploai201@gmail.com");
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

  /**
   * POST /public/feedback — feedback from the marketing site (no account).
   *
   * Unauthenticated mail-sending is a spam vector, so this is defended three
   * ways: a per-IP rate limit at the route, a honeypot field, and a required
   * well-formed email. The address is unverified, so it is used for Reply-To
   * and shown in the body — never trusted as identity.
   */
  submitPublic = async (req: Request, res: Response): Promise<void> => {
    const parsed = PublicFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: "Invalid feedback", details: parsed.error.flatten() } });
      return;
    }

    // Honeypot tripped — answer as though it worked so bots learn nothing.
    if (parsed.data.company) {
      logger.debug("Public feedback honeypot tripped");
      res.status(202).json({ received: true });
      return;
    }

    const recipient = env.FEEDBACK_TO ?? env.SMTP_USER;
    if (!this.mailer.isConfigured() || !recipient) {
      logger.warn("Public feedback received but mail is not configured");
      throw AppError.internal("Feedback can't be delivered right now — please email deploai201@gmail.com");
    }

    const name = parsed.data.name?.trim() || parsed.data.email.split("@")[0] || "Visitor";
    const mail = buildFeedbackEmail({
      appUrl: env.ALLOWED_ORIGINS[0] ?? "https://www.deplo.in",
      type: parsed.data.type as FeedbackType,
      message: parsed.data.message,
      steps: parsed.data.steps,
      context: parsed.data.context,
      // Marked plainly so a visitor is never mistaken for a signed-in user.
      user: { id: "visitor (not signed in)", name, email: parsed.data.email, githubLogin: "—" },
    });

    await this.mailer.send({
      to: recipient,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: `${name} <${parsed.data.email}>`,
    });

    logger.info("Public feedback submitted", { type: parsed.data.type, path: parsed.data.context.path });
    res.status(202).json({ received: true });
  };
}