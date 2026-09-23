import 'server-only';

import { Logger } from '@/lib/logger';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Emisor MÍNIMO de mails sobre SMTP. Es el límite deliberado entre P4 y P5.
 *
 * P4 necesita mandar exactamente dos mails —la invitación de usuario y la recuperación de
 * contraseña— y sin ellos la fase queda incompleta: un admin no podría dar de alta a nadie.
 * Así que acá vive lo imprescindible: un transporte SMTP configurable por entorno, dos
 * plantillas inline y un envío directo.
 *
 * Lo que NO está acá, a propósito, porque es P5 ("jobs y email"):
 * - Cola, reintentos y backoff: hoy un fallo de SMTP se loguea y el flujo sigue.
 * - Registro de enviados / trazabilidad.
 * - Motor de plantillas y layout de marca.
 * - Cualquier otro mail del sistema (alertas de documentos, avisos de mantenimiento).
 *
 * Cuando P5 traiga esa infraestructura, `sendMail()` es el único punto a redirigir: los dos
 * llamadores de arriba no conocen nada de SMTP.
 *
 * Si SMTP no está configurado (`SMTP_HOST` vacío) el envío no explota: se loguea el mensaje
 * completo —con el enlace— para poder terminar el flujo a mano en desarrollo. El logger emite
 * sólo con `NEXT_PUBLIC_SHOW_LOGS=true`; sin eso el enlace también se puede sacar de
 * `auth_verification` (el token va en `identifier`, como `reset-password:<token>`).
 */
const logger = new Logger('shared/mailer');

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  if (!cachedTransport) {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    cachedTransport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  return cachedTransport;
}

function fromAddress(): string {
  const address = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'no-reply@localhost';
  const name = process.env.EMAIL_FROM_NAME?.trim();
  return name ? `${name} <${address}>` : address;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Envía un mail. NO lanza: devuelve `false` si no se pudo enviar.
 *
 * Los dos llamadores de P4 tratan el fallo como no fatal a propósito — el usuario ya quedó
 * creado / el token ya quedó emitido, y reventar acá sólo agregaría una segunda falla.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const transport = getTransport();

  if (!transport) {
    logger.warn('SMTP sin configurar: el mail no se envía (desarrollo)', {
      data: { to: message.to, subject: message.subject, text: message.text },
    });
    return false;
  }

  try {
    await transport.sendMail({ from: fromAddress(), ...message });
    logger.info('Mail enviado', { data: { to: message.to, subject: message.subject } });
    return true;
  } catch (error) {
    logger.error('No se pudo enviar el mail', { data: { error, to: message.to, subject: message.subject } });
    return false;
  }
}

function layout(title: string, body: string, action: { url: string; label: string }): string {
  return `<!doctype html><html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.5">
  <h2 style="color:#111827">${title}</h2>
  <p>${body}</p>
  <p><a href="${action.url}" style="display:inline-block;padding:10px 18px;background:#ea580c;color:#fff;text-decoration:none;border-radius:6px">${action.label}</a></p>
  <p style="font-size:12px;color:#6b7280">Si el botón no funciona, copiá este enlace en tu navegador:<br>${action.url}</p>
</body></html>`;
}

/** Recuperación de contraseña. Lo llama `emailAndPassword.sendResetPassword` de Better Auth. */
export async function sendPasswordResetEmail(params: { to: string; name?: string | null; url: string }): Promise<boolean> {
  const saludo = params.name ? `Hola ${params.name}` : 'Hola';
  return sendMail({
    to: params.to,
    subject: 'Restablecé tu contraseña',
    text: `${saludo}, entrá a este enlace para elegir una nueva contraseña: ${params.url}`,
    html: layout(
      'Restablecé tu contraseña',
      `${saludo}, pediste restablecer tu contraseña. El enlace vence en 24 horas.`,
      { url: params.url, label: 'Elegir nueva contraseña' }
    ),
  });
}

/** Invitación a la empresa: el usuario recién creado define su propia contraseña. */
export async function sendInvitationEmail(params: {
  to: string;
  name?: string | null;
  companyName: string;
  url: string;
}): Promise<boolean> {
  const saludo = params.name ? `Hola ${params.name}` : 'Hola';
  return sendMail({
    to: params.to,
    subject: `Te invitaron a ${params.companyName}`,
    text: `${saludo}, te crearon un usuario en ${params.companyName}. Definí tu contraseña acá: ${params.url}`,
    html: layout(
      `Te invitaron a ${params.companyName}`,
      `${saludo}, te crearon un usuario. Definí tu contraseña para entrar por primera vez; el enlace vence en 24 horas.`,
      { url: params.url, label: 'Definir mi contraseña' }
    ),
  });
}
