'use server';

import { Logger } from '@/lib/logger';
import { getCachedSession } from '@/shared/lib/cached-session';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Empresa/General');

/**
 * Obtiene los datos de la empresa actual con Prisma.
 * Solo selecciona los campos usados por CompanyComponent.
 */
export async function getCompanyBySession() {
  logger.debug('Obteniendo datos de empresa');

  try {
    const session = await getCachedSession();
    const companyId = session?.user?.app_metadata?.company;

    if (!companyId) {
      logger.warn('No se encontró company_id en la sesión');
      return null;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        company_name: true,
        company_cuit: true,
        address: true,
        country: true,
        industry: true,
        contact_phone: true,
        contact_email: true,
        cities: {
          select: { name: true },
        },
        provinces: {
          select: { name: true },
        },
      },
    });

    return company;
  } catch (error) {
    logger.error('Error al obtener datos de empresa', { data: { error } });
    return null;
  }
}

export type CompanyData = Awaited<ReturnType<typeof getCompanyBySession>>;
