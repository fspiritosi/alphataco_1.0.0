'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';

const logger = new Logger('shared/shared-users');

/**
 * Usuarios con acceso compartido a una empresa (`share_company_users`) con su profile y
 * el cliente al que están limitados (rol Invitado).
 */
export async function getSharedUsersByCompany(companyId: string) {
  try {
    return await prisma.share_company_users.findMany({
      where: withCompany({}, companyId),
      include: {
        profile: true,
        customers: { select: { id: true, name: true, cuit: true, address: true, is_active: true } },
      },
      orderBy: { created_at: 'asc' },
    });
  } catch (error) {
    logger.error('Error fetching shared users', { data: { error, companyId } });
    return [];
  }
}

/**
 * Rol del usuario de sesión (`credentialId` = `profile.credential_id`) dentro de una empresa:
 * el `profile.role` de su fila en `share_company_users`, u `'Owner'` si no está compartido
 * (es el dueño o no tiene fila).
 */
export async function getActualRole(companyId: string, credentialId: string): Promise<string> {
  if (!companyId || !credentialId) return 'Owner';
  const membership = await prisma.share_company_users.findFirst({
    where: { company_id: companyId, profile: { credential_id: credentialId } },
    select: { profile: { select: { role: true } } },
  });
  return membership?.profile?.role || 'Owner';
}
