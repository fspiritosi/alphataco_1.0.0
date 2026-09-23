import 'server-only';

import { renderActionEmail } from '../shell';
import { sendMail } from '../transport';

/**
 * Correos transaccionales de autenticación (P4): invitación y recuperación de contraseña.
 *
 * Venían inline en `src/shared/lib/mailer.ts`; P5 los movió acá sin cambiarles el texto ni el
 * diseño, sólo para que el transporte quede separado de las plantillas. El layout es el
 * mismo, ahora compartido en `shell.ts` (`renderActionEmail`) y con escapado de los valores
 * que vienen de la base (`name`, `companyName`).
 *
 * Si SMTP no está configurado el envío no explota: `sendMail` loguea el mensaje completo
 * —con el enlace— para poder terminar el flujo a mano en desarrollo. El logger emite sólo con
 * `NEXT_PUBLIC_SHOW_LOGS=true`; sin eso el enlace también se puede sacar de
 * `auth_verification` (el token va en `identifier`, como `reset-password:<token>`).
 */

/** Recuperación de contraseña. Lo llama `emailAndPassword.sendResetPassword` de Better Auth. */
export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string | null;
  url: string;
}): Promise<boolean> {
  const saludo = params.name ? `Hola ${params.name}` : 'Hola';
  return sendMail({
    to: params.to,
    subject: 'Restablecé tu contraseña',
    text: `${saludo}, entrá a este enlace para elegir una nueva contraseña: ${params.url}`,
    html: renderActionEmail(
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
    html: renderActionEmail(
      `Te invitaron a ${params.companyName}`,
      `${saludo}, te crearon un usuario. Definí tu contraseña para entrar por primera vez; el enlace vence en 24 horas.`,
      { url: params.url, label: 'Definir mi contraseña' }
    ),
  });
}
