import { Injectable, Logger } from '@nestjs/common';

export type OutgoingMail = {
  to: string;
  subject: string;
  body: string;
  /** Used for filtering / categorisation by the relay or the SMTP server. */
  category?: string;
};

/**
 * Pluggable mail relay. By design avoids pulling a heavyweight SMTP
 * dependency into the app — instead it forwards each message to a
 * relay URL (e.g. an internal webhook that fronts SES / SendGrid /
 * postfix). When `MAIL_RELAY_URL` is not set, mails are logged but not
 * sent — useful for dev and acceptable for CI.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly relayUrl = process.env.MAIL_RELAY_URL ?? null;
  private readonly relayToken = process.env.MAIL_RELAY_TOKEN ?? null;
  private readonly fromAddress =
    process.env.MAIL_FROM_ADDRESS ?? 'lanventory@localhost';

  async send(mail: OutgoingMail): Promise<void> {
    if (!mail.to?.trim()) {
      this.logger.warn('Skipping mail send — empty recipient');
      return;
    }

    if (!this.relayUrl) {
      this.logger.log(
        `[mail-stub] to=${mail.to} subject="${mail.subject}" category=${mail.category ?? '-'}`,
      );
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.relayToken) {
        headers['Authorization'] = `Bearer ${this.relayToken}`;
      }
      const res = await fetch(this.relayUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: this.fromAddress,
          to: mail.to,
          subject: mail.subject,
          body: mail.body,
          category: mail.category,
        }),
      });
      if (!res.ok) {
        this.logger.warn(
          `Mail relay returned ${res.status} for ${mail.to}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Mail relay failed for ${mail.to}: ${(err as Error).message}`,
      );
    }
  }

  async sendMany(mails: OutgoingMail[]): Promise<void> {
    await Promise.all(mails.map((m) => this.send(m)));
  }
}
