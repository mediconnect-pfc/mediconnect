import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT') || 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    const secure = config.get<string>('SMTP_SECURE') === 'true';

    this.from = config.get<string>('MAIL_FROM') || user || 'noreply@mediconnect.local';
    this.transporter =
      host && user && pass
        ? nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
          })
        : null;
  }

  isConfigured(): boolean {
    return Boolean(this.transporter);
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured. Password reset link for ${to}: ${resetLink}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Reinitialisation de votre mot de passe MediConnect',
      text: [
        'Bonjour,',
        '',
        'Vous avez demande la reinitialisation de votre mot de passe MediConnect.',
        `Ouvrez ce lien pour choisir un nouveau mot de passe: ${resetLink}`,
        '',
        'Ce lien expire dans 1 heure. Si vous n etes pas a l origine de cette demande, ignorez cet email.',
      ].join('\n'),
      html: `
        <p>Bonjour,</p>
        <p>Vous avez demande la reinitialisation de votre mot de passe MediConnect.</p>
        <p><a href="${resetLink}">Choisir un nouveau mot de passe</a></p>
        <p>Ce lien expire dans 1 heure. Si vous n etes pas a l origine de cette demande, ignorez cet email.</p>
      `,
    });
  }
}
