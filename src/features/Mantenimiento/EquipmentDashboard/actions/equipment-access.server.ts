'use server';

import { getResourceCompanyId } from '@/features/Mantenimiento/shared/resource-company';
import { Logger } from '@/lib/logger';
import { canAccessCompany } from '@/shared/lib/company-membership';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';

const logger = new Logger('features/Mantenimiento/EquipmentDashboard/access');

/**
 * Rol del usuario de sesión sobre la empresa dueña del equipo del QR.
 *
 * Reemplaza a `GET /api/shared_company_role?company_id=...&profile_id=...`, que aceptaba
 * ambos ids del caller: con la URL a mano cualquiera podía listar las membresías de
 * cualquier empresa. Acá la empresa se deriva del equipo de la ruta (el flujo QR corre sin
 * empresa activa en la sesión, así que `getActiveCompanyId()` no sirve) y el profile sale
 * de la sesión.
 *
 * `share_company_users` no tiene columna `role`: el rol del invitado vive en `profile.role`
 * (mismo criterio que `getStoreSharedUsers`). La membresía sólo decide si el rol aplica a
 * esta empresa; sin sesión, sin profile o sin acceso devuelve `null`.
 */
export async function getSessionRoleForEquipment(equipmentId: string): Promise<string | null> {
  const credentialId = await getSessionUserId();
  if (!credentialId) return null;

  try {
    const companyId = await getResourceCompanyId(prisma, 'vehicle', equipmentId);

    const profile = await prisma.profile.findUnique({
      where: { credential_id: credentialId },
      select: { id: true, role: true },
    });
    if (!profile) return null;

    const [company, membership] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { owner_id: true } }),
      prisma.share_company_users.findFirst({
        where: { profile_id: profile.id, company_id: companyId },
        select: { is_active: true },
      }),
    ]);

    if (!canAccessCompany({ profileId: profile.id, company, membership })) return null;

    return profile.role ?? null;
  } catch (error) {
    logger.error('Error al resolver el rol del usuario sobre el equipo', { data: { error, equipmentId } });
    return null;
  }
}
