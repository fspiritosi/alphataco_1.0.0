'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('features/Empresa/Clientes/contacts');

/** Contactos de la empresa activa con el nombre de su cliente (`contact_phone` bigint → string). */
export async function getContacts() {
  const companyId = await getActiveCompanyId();
  try {
    const rows = await prisma.contacts.findMany({
      where: withCompany({}, companyId),
      include: { customers: { select: { id: true, name: true } } },
      orderBy: { contact_name: 'asc' },
    });
    return rows.map(({ contact_phone, ...rest }) => ({
      ...rest,
      contact_phone: contact_phone === null ? null : contact_phone.toString(),
    }));
  } catch (error) {
    logger.error('Error al obtener contactos', { data: { error, companyId } });
    throw error;
  }
}

export type ContactRow = Awaited<ReturnType<typeof getContacts>>[number];
