/**
 * Capa de correo del sistema (P5).
 *
 * - `transport.ts` — el único emisor SMTP. Es el `sendMail()` de P4 generalizado.
 * - `shell.ts` — layout y primitivas HTML compartidas por todas las plantillas.
 * - `templates/` — plantillas transaccionales globales (auth). Las de los jobs viven en
 *   `src/features/Jobs/templates/`, porque dependen del dominio de cada job.
 */
export { fromAddress, resetMailTransport, sendMail, type MailMessage, type SendMail } from './transport';
export { sendInvitationEmail, sendPasswordResetEmail } from './templates/auth';
