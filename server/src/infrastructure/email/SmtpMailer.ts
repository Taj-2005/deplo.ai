import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../shared/logger/logger";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Set so replying reaches the person the mail is about, not the no-reply box. */
  replyTo?: string;
}

/**
 * SMTP mailer — deployment lifecycle notifications. The feature is soft-off:
 * when SMTP env vars are absent, isConfigured() is false and callers skip
 * sending. Sending failures are logged and swallowed by callers — email must
 * never affect a deployment's outcome.
 */
export class SmtpMailer {
  private transporter: Transporter | null = null;

  isConfigured(): boolean {
    return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.isConfigured()) {
      logger.debug("SMTP not configured — skipping email", { subject: message.subject });
      return;
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE, // true for 465, false for 587 (STARTTLS)
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
    }

    await this.transporter.sendMail({
      from: env.MAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    });
    logger.info("Notification email sent", { to: message.to, subject: message.subject });
  }
}
