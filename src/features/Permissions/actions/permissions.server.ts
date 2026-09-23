'use server';

import { Logger } from '@/lib/logger';
import { getSessionUserId } from '@/shared/lib/session';
import { callFunction, callScalar } from '@/shared/lib/sql';
import { getActiveCompanyId, NoActiveCompanyError } from '@/shared/lib/tenant';
import { cache } from 'react';
import { z } from 'zod';
import { findTabDef } from '../lib/permissions-map-utils';
import { hasInferredView } from '../lib/visibility';
import { PERMISSIONS } from '../permissions-map';
import {
  accessibleModuleRowSchema,
  checkMultiplePermissionsRowSchema,
  userPermissionRowSchema,
} from './permissions.schemas';

const logger = new Logger('features/Permissions');

/**
 * Server Actions de verificación de permisos — capa única sobre Prisma + `callFunction`.
 *
 * Los 4 RPC de `prisma/sql/permissions.sql` (`get_user_permissions`, `check_multiple_permissions`,
 * `user_has_permission`, `get_user_accessible_modules`) se invocan siempre con
 * `p_user_id = await getSessionUserId()` y `p_company_id = await getActiveCompanyId()`: nunca se
 * acepta un userId ni una empresa del cliente para estas funciones de "permisos del usuario
 * actual". Sin sesión o sin empresa activa, se devuelve "sin permisos" (no error).
 *
 * La empresa es parte de la pregunta desde la Task 13a: `user_roles` tiene `company_id`, así que
 * un rol vale en la empresa donde se otorgó. El mismo usuario puede ser admin en una empresa y
 * no tener nada en otra.
 *
 * OPTIMIZACIÓN: `getUserPermissionsServer` usa cache de React para memoizar el resultado durante
 * el mismo request — varios componentes/Server Actions del mismo render sólo disparan UNA query.
 */

/**
 * Empresa activa del request, o `null` si la sesión todavía no tiene una (usuario recién
 * creado que va a dar de alta su primera empresa, cookie descartada, etc.). Los helpers de
 * permisos devuelven "sin permisos" en ese caso, no un error.
 */
async function getActiveCompanyIdOrNull(): Promise<string | null> {
  try {
    return await getActiveCompanyId();
  } catch (error) {
    if (error instanceof NoActiveCompanyError) return null;
    throw error;
  }
}

const getCachedUserPermissions = cache(async (): Promise<z.infer<typeof userPermissionRowSchema>[]> => {
  const [userId, companyId] = await Promise.all([getSessionUserId(), getActiveCompanyIdOrNull()]);
  if (!userId || !companyId) {
    logger.warn('No hay sesión activa o empresa activa para obtener permisos');
    return [];
  }

  try {
    return await callFunction(
      'get_user_permissions',
      [{ uuid: userId }, { uuid: companyId }],
      z.array(userPermissionRowSchema)
    );
  } catch (error) {
    logger.error('Error obteniendo permisos del usuario', { data: { error } });
    return [];
  }
});

/**
 * Obtiene todos los permisos del usuario de sesión actual.
 */
export async function getUserPermissionsServer() {
  return getCachedUserPermissions();
}

/**
 * Obtiene todos los permisos del usuario de sesión como un objeto plano (serializable):
 * key = "module:tab:action", value = boolean concedido.
 */
export async function getUserPermissionsMapServer(): Promise<Record<string, boolean>> {
  try {
    const permissions = await getCachedUserPermissions();
    const permissionMap: Record<string, boolean> = {};

    for (const perm of permissions) {
      const key = `${perm.module_slug}:${perm.tab_slug}:${perm.action_slug}`;
      permissionMap[key] = perm.is_granted === true;
    }

    return permissionMap;
  } catch (error) {
    logger.error('Error construyendo el mapa de permisos', { data: { error } });
    return {};
  }
}

/**
 * Verifica múltiples permisos en una sola llamada (una sola query a la BD via `check_multiple_permissions`).
 */
export async function checkMultiplePermissionsServer(
  permissions: Array<{ moduleSlug: string; tabSlug: string; actionSlug: string }>
): Promise<Map<string, boolean>> {
  const [userId, companyId] = await Promise.all([getSessionUserId(), getActiveCompanyIdOrNull()]);
  if (!userId || !companyId) {
    logger.warn('No hay sesión activa o empresa activa para verificar múltiples permisos');
    return new Map();
  }

  const payload = permissions.map((p) => ({ module: p.moduleSlug, tab: p.tabSlug, action: p.actionSlug }));

  try {
    const rows = await callFunction(
      'check_multiple_permissions',
      [{ uuid: userId }, { uuid: companyId }, { json: payload }],
      z.array(checkMultiplePermissionsRowSchema)
    );

    const resultMap = new Map<string, boolean>();
    for (const row of rows) {
      resultMap.set(`${row.module_slug}:${row.tab_slug}:${row.action_slug}`, row.has_permission);
    }
    return resultMap;
  } catch (error) {
    logger.error('Error verificando múltiples permisos', { data: { error } });
    return new Map();
  }
}

/**
 * Verifica si el usuario de sesión tiene un permiso específico.
 */
export async function checkPermissionServer(moduleSlug: string, tabSlug: string, actionSlug: string): Promise<boolean> {
  const [userId, companyId] = await Promise.all([getSessionUserId(), getActiveCompanyIdOrNull()]);
  if (!userId || !companyId) {
    logger.warn('No hay sesión activa o empresa activa para verificar permiso');
    return false;
  }

  try {
    return await callScalar(
      'user_has_permission',
      [{ uuid: userId }, { uuid: companyId }, moduleSlug, tabSlug, actionSlug],
      z.boolean()
    );
  } catch (error) {
    logger.error('Error verificando permiso del usuario', { data: { error, moduleSlug, tabSlug, actionSlug } });
    return false;
  }
}

/**
 * Verifica si el usuario puede ver un tab, con inferencia de visibilidad: si no tiene
 * `view` explícito sobre el tab, pero sí sobre alguna de sus subtabs, el tab padre se
 * considera visible (lógica pura en `lib/visibility.ts`).
 *
 * Trae el set completo de permisos del usuario UNA sola vez (cache por request) en vez de
 * ir consultando subtab por subtab, evitando N round-trips a la BD.
 */
export async function canViewServer(moduleSlug: string, tabSlug: string): Promise<boolean> {
  const permissions = await getCachedUserPermissions();
  const grantedViewTabSlugs = new Set(
    permissions.filter((p) => p.module_slug === moduleSlug && p.action_slug === 'view' && p.is_granted).map((p) => p.tab_slug)
  );

  if (grantedViewTabSlugs.has(tabSlug)) return true;

  const tabDef = findTabDef(PERMISSIONS, moduleSlug, tabSlug);
  return hasInferredView(tabDef, grantedViewTabSlugs);
}

/**
 * Obtiene los módulos accesibles (con permiso 'view' en al menos un tab) para el usuario de sesión.
 */
export async function getUserAccessibleModulesServer() {
  const [userId, companyId] = await Promise.all([getSessionUserId(), getActiveCompanyIdOrNull()]);
  if (!userId || !companyId) {
    logger.warn('No hay sesión activa o empresa activa para obtener módulos accesibles');
    return [];
  }

  try {
    const rows = await callFunction(
      'get_user_accessible_modules',
      [{ uuid: userId }, { uuid: companyId }],
      z.array(accessibleModuleRowSchema)
    );
    // module_slug/module_icon son nullable en BD (modules.slug/icon); los consumidores
    // (sidebar) siempre esperaron string — mismo comportamiento que el RPC de Supabase.
    return rows.map((row) => ({
      module_id: row.module_id,
      module_slug: row.module_slug ?? '',
      module_name: row.module_name,
      module_icon: row.module_icon ?? '',
    }));
  } catch (error) {
    logger.error('Error obteniendo módulos accesibles', { data: { error } });
    return [];
  }
}
