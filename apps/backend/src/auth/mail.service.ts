import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly brevoApiKey?: string;
  private readonly brevoApiUrl: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT') || 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    const secure = config.get<string>('SMTP_SECURE') === 'true';
    const mailFrom = config.get<string>('MAIL_FROM');

    this.brevoApiKey = config.get<string>('BREVO_API_KEY');
    this.brevoApiUrl = config.get<string>('BREVO_API_URL') || 'https://api.brevo.com/v3/smtp/email';
    this.fromEmail =
      config.get<string>('MAIL_FROM_EMAIL') ||
      this.extractEmail(mailFrom) ||
      user ||
      'noreply@mediconnect.local';
    this.fromName = config.get<string>('MAIL_FROM_NAME') || this.extractName(mailFrom) || 'MediConnect';
    this.from = mailFrom || `${this.fromName} <${this.fromEmail}>`;

    this.transporter =
      host && user && pass
        ? nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
          })
        : null;

    if (this.brevoApiKey) {
      this.logger.log(`Brevo email API configured with sender ${this.fromName} <${this.fromEmail}>`);
    } else if (this.transporter) {
      this.logger.log(`SMTP configured with host ${host}:${port} as ${user}`);
    } else {
      this.logger.warn('Email provider not configured. Password reset emails will not be sent.');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.brevoApiKey || this.transporter);
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    if (this.brevoApiKey) {
      await this.sendPasswordResetWithBrevo(to, resetLink);
      return;
    }

    if (!this.transporter) {
      this.logger.warn(`Email provider not configured. Password reset link for ${to}: ${resetLink}`);
      return;
    }

    const info = await this.transporter.sendMail({
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

    this.logger.log(`Password reset email sent to ${to}. Message id: ${info.messageId ?? 'unknown'}`);
  }

  private async sendPasswordResetWithBrevo(to: string, resetLink: string): Promise<void> {
    const response = await fetch(this.brevoApiUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': this.brevoApiKey!,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: this.fromEmail,
          name: this.fromName,
        },
        to: [{ email: to }],
        subject: 'Reinitialisation de votre mot de passe MediConnect',
        textContent: [
          'Bonjour,',
          '',
          'Vous avez demande la reinitialisation de votre mot de passe MediConnect.',
          `Ouvrez ce lien pour choisir un nouveau mot de passe: ${resetLink}`,
          '',
          'Ce lien expire dans 1 heure. Si vous n etes pas a l origine de cette demande, ignorez cet email.',
        ].join('\n'),
        htmlContent: `
          <p>Bonjour,</p>
          <p>Vous avez demande la reinitialisation de votre mot de passe MediConnect.</p>
          <p><a href="${resetLink}">Choisir un nouveau mot de passe</a></p>
          <p>Ce lien expire dans 1 heure. Si vous n etes pas a l origine de cette demande, ignorez cet email.</p>
        `,
      }),
    });

    const body = (await response.json().catch(() => null)) as { messageId?: string; message?: string } | null;
    if (!response.ok) {
      throw new Error(
        `Brevo email API failed with ${response.status}: ${body?.message || response.statusText}`,
      );
    }

    this.logger.log(`Password reset email sent to ${to} via Brevo. Message id: ${body?.messageId ?? 'unknown'}`);
  }

  private extractEmail(value?: string): string | null {
    const match = value?.match(/<([^>]+)>/);
    return match?.[1]?.trim() || value?.trim() || null;
  }

  private extractName(value?: string): string | null {
    const match = value?.match(/^(.+?)\s*</);
    return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') || null;
  }
}
