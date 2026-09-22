'use server';

import { logger } from '@/lib/logger';
import { adminSupabaseServer } from '@/lib/supabase/server'; // P4: auth
import { canAccessCompany } from '@/shared/lib/company-membership';
import { prisma } from '@/shared/lib/prisma';
import { getSessionCompanyClaim, getSessionUser } from '@/shared/lib/session';

export type SetCompanyMetadataResult = { ok: boolean; error?: string };

/**
 * Cambia la empresa activa del usuario (app_metadata.company del JWT).
 *
 * Lee el usuario de sesión, valida que el profile sea owner o miembro activo de
 * `company_id` y recién ahí escribe con el admin client. Sin esta validación cualquier
 * UUID de empresa pasaba a ser la empresa activa de `getActiveCompanyId()` (fuga cross-tenant).
 */
export const setNewCompanyUserMetadata = async (company_id: string): Promise<SetCompanyMetadataResult> => {
  if (!company_id) return { ok: false, error: 'Empresa inválida' };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'No hay sesión activa' };

  const profile = await prisma.profile.findUnique({
    where: { credential_id: user.id },
    select: { id: true },
  });

  if (!profile) {
    logger.warn('Profile no encontrado para credential_id al cambiar de empresa', { data: { credentialId: user.id } });
    return { ok: false, error: 'No tenés acceso a esa empresa' };
  }

  const [company, membership] = await Promise.all([
    prisma.company.findUnique({ where: { id: company_id }, select: { owner_id: true } }),
    prisma.share_company_users.findFirst({
      where: { profile_id: profile.id, company_id },
      select: { is_active: true },
    }),
  ]);

  if (!canAccessCompany({ profileId: profile.id, company, membership })) {
    logger.warn('Intento de cambiar a una empresa sin pertenencia', {
      data: { profileId: profile.id, companyId: company_id },
    });
    return { ok: false, error: 'No tenés acceso a esa empresa' };
  }

  if ((await getSessionCompanyClaim()) === company_id) return { ok: true };

  // P4: auth — el claim de empresa vive en el JWT de Supabase hasta que P4 traiga la sesión propia.
  const admin = await adminSupabaseServer(); // P4: auth
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { company: company_id },
  });

  if (error) {
    logger.error('Error actualizando app_metadata.company', { data: { userId: user.id, message: error.message } });
    return { ok: false, error: 'No se pudo cambiar la empresa activa' };
  }

  return { ok: true };
};

/** `{ id, email }` del usuario de sesión o null. */
export const fetchCurrentUser = async () => {
  return getSessionUser();
};
