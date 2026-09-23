'use server';

import { logger } from '@/lib/logger';
import { adminSupabaseServer } from '@/lib/supabase/server'; // P4: auth
import { getSessionCompanyClaim, getSessionUser } from '@/shared/lib/session';
import { canUseAsActiveCompany, clearActiveCompanyCookie, setActiveCompanyCookie } from '@/shared/lib/tenant';

export type SwitchActiveCompanyResult = { ok: boolean; error?: string };

/** Un año: la empresa activa del dashboard sobrevive al cierre del navegador. */
const ACTIVE_COMPANY_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Cambia la empresa activa del usuario. Es la ÚNICA vía de escritura desde el cliente.
 *
 * Antes el cliente escribía `actualComp` con `js-cookie` y avisaba al servidor por
 * separado: la cookie quedaba a merced de `document.cookie` y con ella el perímetro de
 * todo el sistema. Ahora la cookie es `httpOnly` y sólo se escribe acá, después de validar
 * con `canUseAsActiveCompany()` que el usuario tenga un vínculo real con esa empresa.
 *
 * Escribe las dos caras de la empresa activa, en este orden:
 * 1. `app_metadata.company` del JWT, que es lo que `getActiveCompanyId()` prefiere. Si
 *    esto fallara y sólo se escribiera la cookie, el claim viejo seguiría ganando y el
 *    cambio de empresa sería un no-op silencioso.
 * 2. La cookie `actualComp`, que es de donde sale la empresa mientras el JWT no se refresca.
 */
export const switchActiveCompany = async (companyId: string): Promise<SwitchActiveCompanyResult> => {
  if (!companyId) return { ok: false, error: 'Empresa inválida' };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'No hay sesión activa' };

  if (!(await canUseAsActiveCompany(companyId))) {
    logger.warn('Intento de cambiar a una empresa sin pertenencia', {
      data: { userId: user.id, companyId },
    });
    return { ok: false, error: 'No tenés acceso a esa empresa' };
  }

  if ((await getSessionCompanyClaim()) !== companyId) {
    // P4: auth — el claim de empresa vive en el JWT de Supabase hasta que P4 traiga la sesión propia.
    const admin = await adminSupabaseServer(); // P4: auth
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { company: companyId },
    });

    if (error) {
      logger.error('Error actualizando app_metadata.company', { data: { userId: user.id, message: error.message } });
      return { ok: false, error: 'No se pudo cambiar la empresa activa' };
    }
  }

  await setActiveCompanyCookie(companyId, ACTIVE_COMPANY_MAX_AGE);

  return { ok: true };
};

/**
 * Borra la empresa activa del request (cierre de sesión desde el cliente).
 *
 * La cookie es `httpOnly`, así que el `cookie.remove()` del menú de usuario ya no la
 * alcanza: el borrado tiene que pasar por el servidor.
 */
export const clearActiveCompany = async (): Promise<void> => {
  await clearActiveCompanyCookie();
};

/** `{ id, email }` del usuario de sesión o null. */
export const fetchCurrentUser = async () => {
  return getSessionUser();
};
