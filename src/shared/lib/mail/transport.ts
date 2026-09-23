import 'server-only';

import { Logger } from '@/lib/logger';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Transporte SMTP de todo el sistema. Es `sendMail()` de P4 generalizado en P5.
 *
 * P4 lo dejó con un solo destinatario (`to: string`) y dos plantillas inline, y anotó que
 * `sendMail()` era «el único punto a redirigir». P5 cumple esa promesa: las plantillas se
 * fueron a `./templates/`, el layout compartido a `./shell.ts`, y acá queda sólo el
 * transporte — que ahora acepta varios destinatarios, `cc` y `bcc`, porque los correos de
 * los jobs van a la lista de `notification_settings` de cada empresa.
 *
 * **Sin `SMTP_HOST` no explota**: loguea y devuelve `false`. Esa propiedad de P4 se mantiene
 * a propósito, porque el contenedor de cron corre igual en entornos sin SMTP configurado y
 * un job no puede caerse por eso (el job lo registra como «no enviado» en `jobs_runs`).
 */
const logger = new Logger('shared/mail');

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

/** Sólo para los tests: obliga a releer `SMTP_*` en la próxima llamada. */
export function resetMailTransport(): void {
  cachedTransport = null;
}

export function fromAddress(): string {
  const address = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'no-reply@localhost';
  const name = process.env.EMAIL_FROM_NAME?.trim();
  return name ? `${name} <${address}>` : address;
}

export interface MailMessage {
  /** Uno o varios destinatarios. Con varios, nodemailer arma el header `To:` separado por comas. */
  to: string | readonly string[];
  cc?: readonly string[];
  bcc?: readonly string[];
  subject: string;
  /**
   * Al menos uno de `text`/`html` tiene que venir. Van como opcionales para poder OMITIR la
   * parte que no hay: mandar `''` produce un multipart con una parte vacía, que algunos
   * clientes muestran como un mensaje en blanco.
   */
  text?: string;
  html?: string;
}

/** Firma del emisor, para poder inyectar un doble en los tests de los jobs. */
export type SendMail = (message: MailMessage) => Promise<boolean>;

function joinAddresses(value: string | readonly string[] | undefined): string | undefined {
  if (!value) return undefined;
  const list = typeof value === 'string' ? [value] : value;
  const clean = list.map((address) => address.trim()).filter((address) => address.length > 0);
  return clean.length > 0 ? clean.join(', ') : undefined;
}

/**
 * Envía un mail. NO lanza: devuelve `false` si no se pudo enviar.
 *
 * Los llamadores tratan el fallo como no fatal a propósito — el usuario ya quedó creado, el
 * token ya quedó emitido, el indicador ya quedó guardado — y reventar acá sólo agregaría una
 * segunda falla. Quien necesite que el fallo se vea (los jobs) lo registra en `jobs_runs`.
 */
export const sendMail: SendMail = async (message) => {
  const to = joinAddresses(message.to);
  if (!to) {
    logger.warn('Mail sin destinatarios: no se envía', { data: { subject: message.subject } });
    return false;
  }

  const transport = getTransport();

  const text = message.text?.trim() ? message.text : undefined;
  const html = message.html?.trim() ? message.html : undefined;

  if (!text && !html) {
    logger.warn('Mail sin contenido: no se envía', { data: { to, subject: message.subject } });
    return false;
  }

  if (!transport) {
    logger.warn('SMTP sin configurar: el mail no se envía (desarrollo)', {
      data: { to, subject: message.subject, text: text ?? html },
    });
    return false;
  }

  try {
    await transport.sendMail({
      from: fromAddress(),
      to,
      cc: joinAddresses(message.cc),
      bcc: joinAddresses(message.bcc),
      subject: message.subject,
      text,
      html,
    });
    logger.info('Mail enviado', { data: { to, subject: message.subject } });
    return true;
  } catch (error) {
    logger.error('No se pudo enviar el mail', { data: { error, to, subject: message.subject } });
    return false;
  }
};
