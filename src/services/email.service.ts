import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface MagicLinkPayload {
  to: string;
  fullName: string;
  loginUrl: string;
}

// Build the transporter once (if SMTP is configured) and reuse it.
// If SMTP_HOST is empty, `transporter` stays null and we fall back to
// logging the magic link (keeps the dev loop fast when you don't want
// to wire SMTP).
let transporter: Transporter | null = null;
if (env.smtp.host) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth:
      env.smtp.user || env.smtp.pass
        ? { user: env.smtp.user, pass: env.smtp.pass }
        : undefined,
  });

  transporter
    .verify()
    .then(() => logger.info(`[Email] SMTP ready on ${env.smtp.host}:${env.smtp.port}`))
    .catch((err: Error) =>
      logger.error('[Email] SMTP verify failed — emails will not send', {
        error: err.message,
      }),
    );
}

const renderMagicLinkHtml = ({ fullName, loginUrl }: MagicLinkPayload): string => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <tr>
              <td style="padding:32px 32px 16px;">
                <h1 style="margin:0 0 8px;font-size:22px;color:#111;">Welcome to ${env.mailFromName}</h1>
                <p style="margin:0;color:#444;font-size:15px;line-height:1.5;">
                  Hi ${fullName},
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;color:#444;font-size:15px;line-height:1.55;">
                Click the button below to sign in to your account. This link expires in
                <strong>${env.magicLinkTtlMinutes} minutes</strong> and can only be used once.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px 32px;">
                <a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;font-size:15px;">
                  Sign in to ${env.mailFromName}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;color:#6b7280;font-size:13px;line-height:1.5;">
                If the button doesn't work, copy and paste this link:<br/>
                <span style="word-break:break-all;color:#2563eb;">${loginUrl}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f8fafc;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
                If you didn't try to sign in, you can safely ignore this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const renderMagicLinkText = ({ fullName, loginUrl }: MagicLinkPayload): string =>
  `Hi ${fullName},

Click the link below to sign in to ${env.mailFromName}. This link expires in ${env.magicLinkTtlMinutes} minutes and can only be used once.

${loginUrl}

If you didn't try to sign in, you can safely ignore this email.`;

export const emailService = {
  sendMagicLink: async (payload: MagicLinkPayload): Promise<void> => {
    if (!transporter) {
      logger.info('[Email:MagicLink] (dev stub — no SMTP configured)', {
        to: payload.to,
        fullName: payload.fullName,
        loginUrl: payload.loginUrl,
      });
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: `"${env.mailFromName}" <${env.mailFrom}>`,
        to: payload.to,
        subject: `Sign in to ${env.mailFromName}`,
        text: renderMagicLinkText(payload),
        html: renderMagicLinkHtml(payload),
      });
      logger.info('[Email:MagicLink] sent', {
        to: payload.to,
        messageId: info.messageId,
      });
    } catch (err) {
      logger.error('[Email:MagicLink] send failed', {
        to: payload.to,
        error: (err as Error).message,
      });
      // Don't re-throw: registration shouldn't fail if the email provider is down.
      // The patient can request a resend via a future "/auth/resend-link" endpoint.
    }
  },
};
