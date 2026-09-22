'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getSessionUserId } from '@/shared/lib/session';
import { assertCompanyAccess } from '@/shared/lib/tenant';

const logger = new Logger('shared/shared-users');

/**
 * Usuarios con acceso compartido a una empresa (`share_company_users`) con su profile y
 * el cliente al que están limitados (rol Invitado).
 */
export async function getSharedUsersByCompany(companyId: string) {
  await assertCompanyAccess(companyId);
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
 * Rol del usuario de sesión dentro de una empresa: el `profile.role` de su fila en
 * `share_company_users`, u `'Owner'` si no está compartido (es el dueño o no tiene fila).
 * El usuario sale SIEMPRE de la sesión; `_credentialId` se conserva por compatibilidad de
 * firma con los llamadores legacy y se ignora.
 */
export async function getActualRole(companyId: string, _credentialId?: string): Promise<string> {
  const credentialId = await getSessionUserId();
  if (!companyId || !credentialId) return 'Owner';
  await assertCompanyAccess(companyId);
  const membership = await prisma.share_company_users.findFirst({
    where: { company_id: companyId, profile: { credential_id: credentialId } },
    select: { profile: { select: { role: true } } },
  });
  return membership?.profile?.role || 'Owner';
}
