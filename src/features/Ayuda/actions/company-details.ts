'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('features/Ayuda/company-details');

/**
 * Datos de la empresa activa para la firma del mail de soporte.
 *
 * Perímetro: la empresa sale de la sesión (`getActiveCompanyId()`), nunca de un `companyId`
 * del caller. Antes la action recibía el id que el cliente leía de la cookie de empresa activa,
 * con lo que cualquier uuid de empresa era consultable desde el navegador.
 */
export async function getActiveCompanyDetails() {
  try {
    const companyId = await getActiveCompanyId();

    return await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, company_name: true, website: true, contact_email: true, company_logo: true },
    });
  } catch (error) {
    logger.error('Error al obtener los datos de la empresa activa', { data: { error } });
    return null;
  }
}

export type ActiveCompanyDetails = Awaited<ReturnType<typeof getActiveCompanyDetails>>;
