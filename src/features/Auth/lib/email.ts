import 'server-only';

import type { EmailInfo } from '@/features/Auth/utils/emailTemplates';
import { renderDocumentEmailTemplate, renderHelpEmailTemplate } from '@/features/Auth/utils/emailTemplates';
import { Logger } from '@/lib/logger';
import nodemailer from 'nodemailer';

/**
 * Envío de correo por el SMTP de la empresa.
 *
 * **No es una Server Action**: el módulo es `server-only` a propósito. Antes vivía en
 * `actions/sendEmail.ts` con `'use server'` y exportada, o sea que era un endpoint público que
 * aceptaba `to` y `html` arbitrarios: cualquiera podía invocarla desde el navegador y mandar el
 * HTML que quisiera a cualquier destinatario desde nuestro SMTP. Es el mismo agujero que se cerró
 * en `POST /api/send`, pero por la puerta de la Server Action.
 *
 * Los llamadores son server-side y fijan el destinatario: `sendHelpRequestEmail`
 * (`features/Ayuda`) y `sendErrorReport` (`lib/utils`).
 */
const logger = new Logger('features/Auth/email');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 300,
  tls: {
    rejectUnauthorized: false,
  },
});

export type EmailOptions = {
  /** Destinatario. Lo fija SIEMPRE el código del servidor, nunca un valor que venga del cliente. */
  to: string;
  subject: string;
  userEmail: string;
  template?: 'document' | 'help';
  body?: EmailInfo;
  html?: string;
  text?: string;
  reason?: string;
};

export type SendEmailResult = { success: true; messageId: string } | { success: false; error: string };

export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  try {
    const { to, subject, userEmail, template, body, html, text, reason } = options;

    let emailHtml = html;

    // Si se especifica un template, usarlo
    if (template && !html) {
      if (template === 'document' && body) {
        emailHtml = renderDocumentEmailTemplate(userEmail, body);
      } else if (template === 'help') {
        emailHtml = renderHelpEmailTemplate({ userEmail, reason, body });
      }
    }

    // Si no hay HTML ni texto, no podemos enviar el correo
    if (!emailHtml && !text) {
      throw new Error('Se requiere contenido HTML o texto para enviar el correo');
    }

    const info = await transporter.sendMail({
      from: `"Grupo Horizonte" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: emailHtml,
      text: text || (emailHtml ? undefined : ''),
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Error enviando el correo', { data: { error } });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
