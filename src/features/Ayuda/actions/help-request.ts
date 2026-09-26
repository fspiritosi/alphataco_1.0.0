'use server';

import { sendEmail } from '@/features/Auth/lib/email';
import { Logger } from '@/lib/logger';
import { getActiveCompanyDetails } from './company-details';
import { getReporterEmail } from './getReporterEmail';

const logger = new Logger('features/Ayuda/help-request');

/** Casilla de soporte. Es fija: el caller nunca elige el destinatario. */
const SUPPORT_MAILBOX = 'soporte@codecontrol.com.ar';
const SUPPORT_SUBJECT = 'Solicitud de ayuda - alphataco';

const FALLBACK_COMPANY_NAME = 'alphataco';
const FALLBACK_LOGO = 'https://tu-dominio.com/logo-codecontrol.png';
const FALLBACK_WEBSITE = 'https://codecontrol.com.ar';
const FALLBACK_SUPPORT_EMAIL = 'soporte@codecontrol.com.ar';

const MAX_REASON_LENGTH = 5000;

/**
 * Envía la solicitud de ayuda del formulario "Reportar un problema".
 *
 * Reemplaza al route handler `POST /api/send`, que aceptaba del cliente el destinatario,
 * el asunto, el email del usuario, los datos de la empresa y hasta el HTML crudo del
 * mensaje: era un relay de correo abierto para cualquiera que conociera la URL. Acá lo
 * único que viaja del cliente es la descripción del problema; el destinatario es fijo, el
 * reporter sale de la sesión (`getReporterEmail()`) y la empresa de `getActiveCompanyId()`
 * vía `getActiveCompanyDetails()`.
 */
export async function sendHelpRequestEmail(reason: string): Promise<{ success: boolean; error?: string }> {
  const reporter = await getReporterEmail();
  if (!reporter) return { success: false, error: 'No hay usuario autenticado' };

  const trimmed = reason.trim();
  if (!trimmed) return { success: false, error: 'Por favor, ingresa una descripción del problema' };
  if (trimmed.length > MAX_REASON_LENGTH) {
    return { success: false, error: 'La descripción es demasiado larga' };
  }

  const company = await getActiveCompanyDetails();
  const companyName = company?.company_name || FALLBACK_COMPANY_NAME;

  const result = await sendEmail({
    to: SUPPORT_MAILBOX,
    subject: SUPPORT_SUBJECT,
    userEmail: reporter.email,
    template: 'help',
    reason: trimmed,
    body: {
      recurso: 'ayuda',
      document_name: 'Solicitud de ayuda',
      company_name: companyName,
      resource_name: 'Soporte',
      document_number: `AYUDA-${Date.now()}`,
      companyConfig: {
        name: companyName,
        logo: company?.company_logo || FALLBACK_LOGO,
        website: company?.website || FALLBACK_WEBSITE,
        supportEmail: company?.contact_email || FALLBACK_SUPPORT_EMAIL,
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
      },
    },
  });

  if (!result.success) {
    logger.error('Error al enviar la solicitud de ayuda', { data: { error: result.error } });
    return { success: false, error: 'Error al enviar la solicitud' };
  }

  logger.info('Solicitud de ayuda enviada', { data: { reporterEmail: reporter.email } });
  return { success: true };
}
