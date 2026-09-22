'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { getCachedSession } from '@/shared/lib/session';
import { cache } from 'react';
import { PERMISSIONS, type ModuleSlug } from './permissions-map';

const logger = new Logger('features/Permissions');

/**
 * Server Actions para verificación de permisos
 *
 * OPTIMIZACIÓN: Estas funciones usan cache de React para evitar múltiples queries
 * en el mismo request del servidor. Esto mejora significativamente el rendimiento
 * cuando múltiples componentes verifican permisos en la misma página.
 *
 * OPTIMIZACIÓN: Usa checkMultiplePermissionsServer para verificar múltiples permisos
 * en una sola llamada, reduciendo significativamente la latencia.
 *
 * Uso en Server Components:
 * ```tsx
 * import { checkMultiplePermissionsServer } from '@/features/Permissions/actionsServer';
 *
 * export default async function MyPage() {
 *   const permissions = await checkMultiplePermissionsServer([
 *     { moduleSlug: 'empleados', tabSlug: 'employees', actionSlug: 'view' },
 *     { moduleSlug: 'empleados', tabSlug: 'employees', actionSlug: 'create' },
 *   ]);
 *
 *   const canView = permissions.get('dashboard:principal:view');
 *   const canCreate = permissions.get('dashboard:estadisticas:create');
 * }
 * ```
 */

/**
 * Obtiene todos los permisos del usuario actual (server-side)
 *
 * OPTIMIZADO: Usa cache de React para memoizar el resultado durante el mismo request.
 * Esto significa que si múltiples componentes llaman a esta función en el mismo render,
 * solo se hará UNA query a la base de datos.
 *
 * @returns Array de permisos del usuario
 * @throws Error si el usuario no está autenticado
 */
const getCachedUserPermissions = cache(async () => {
  const supabase = await supabaseServer();
  const session = await getCachedSession();
  const user = session?.user;

  if (!user) {
    logger.error('No authenticated session for permissions');
    return [];
  }

  // Obtener permisos usando la función SQL
  const { data, error } = await supabase.rpc('get_user_permissions', {
    p_user_id: user.id,
  });

  if (error) {
    logger.error('Error fetching user permissions', { data: { error } });
    return [];
  }

  return data || [];
});

/**
 * Obtiene todos los permisos del usuario actual (server-side)
 *
 * Esta es la función pública que usa el cache interno.
 *
 * @returns Array de permisos del usuario
 */
export async function getUserPermissionsServer() {
  return await getCachedUserPermissions();
}

/**
 * Obtiene todos los permisos del usuario como un objeto plano (serializable)
 *
 * Retorna un objeto plano (Record) en lugar de Map para que sea serializable
 * cuando se pasa como prop entre componentes del servidor en Next.js.
 *
 * @returns Objeto plano con key = "module:tab:action", value = boolean
 * Siempre retorna un objeto válido, incluso si está vacío o hay un error.
 */
export async function getUserPermissionsMapServer(): Promise<Record<string, boolean>> {
  try {
    const permissions = await getCachedUserPermissions();

    // Asegurar que permissions sea un array válido
    if (!Array.isArray(permissions)) {
      logger.warn('getUserPermissionsMapServer: permissions is not an array, returning empty object');
      return {};
    }

    const permissionMap: Record<string, boolean> = {};
    permissions.forEach((perm: any) => {
      if (perm && perm.module_slug && perm.tab_slug && perm.action_slug) {
        const key = `${perm.module_slug}:${perm.tab_slug}:${perm.action_slug}`;
        permissionMap[key] = perm.is_granted === true;
      }
    });

    return permissionMap;
  } catch (error) {
    logger.error('Error in getUserPermissionsMapServer', { data: { error } });
    // Siempre retornar un objeto válido, incluso si hay un error
    return {};
  }
}

/**
 * Verifica múltiples permisos en una sola llamada (OPTIMIZADO)
 *
 * Esta función es significativamente más rápida que llamar a checkPermissionServer
 * múltiples veces, ya que:
 * - Obtiene el user ID una sola vez
 * - Hace una sola llamada a la base de datos para todos los permisos
 *
 * Rendimiento: 8 tabs = 2 queries (~150ms) vs 16 queries (~1000ms)
 *
 * @param permissions - Array de permisos a verificar
 * @returns Map con los resultados: key = "module:tab:action", value = boolean
 *
 * @example
 * ```tsx
 * const permissions = await checkMultiplePermissionsServer([
 *   { moduleSlug: 'dashboard', tabSlug: 'principal', actionSlug: 'view' },
 *   { moduleSlug: 'dashboard', tabSlug: 'estadisticas', actionSlug: 'view' },
 * ]);
 *
 * const canViewPrincipal = permissions.get('dashboard:principal:view');
 * const canViewStats = permissions.get('dashboard:estadisticas:view');
 * ```
 */
export async function checkMultiplePermissionsServer(
  permissions: Array<{ moduleSlug: string; tabSlug: string; actionSlug: string }>
): Promise<Map<string, boolean>> {
  const supabase = await supabaseServer();
  const session = await getCachedSession();
  const user = session?.user;

  if (!user) {
    logger.error('No authenticated session for multiple permissions check');
    return new Map();
  }

  // Preparar el payload para la función SQL
  const permissionsPayload = permissions.map((p) => ({
    module: p.moduleSlug,
    tab: p.tabSlug,
    action: p.actionSlug,
  }));

  // UNA SOLA LLAMADA A LA DB para verificar TODOS los permisos
  const { data, error } = await supabase.rpc('check_multiple_permissions' as any, {
    p_user_id: user.id,
    p_permissions: permissionsPayload,
  });

  if (error) {
    logger.error('Error checking multiple permissions', { data: { error } });
    return new Map();
  }

  // Convertir resultado a Map para acceso O(1)
  const resultMap = new Map<string, boolean>();

  if (Array.isArray(data)) {
    data.forEach((row: any) => {
      const key = `${row.module_slug}:${row.tab_slug}:${row.action_slug}`;
      resultMap.set(key, row.has_permission);
    });
  }

  return resultMap;
}

/**
 * Verifica si el usuario actual tiene un permiso específico (server-side)
 *
 * NOTA: Si necesitas verificar múltiples permisos, usa checkMultiplePermissionsServer
 * en su lugar para mejor rendimiento (85% más rápido).
 *
 * @param moduleSlug - Slug del módulo (ej: 'empleados')
 * @param tabSlug - Slug del tab o subtab (ej: 'docs-empleados-mensuales')
 * @param actionSlug - Slug de la acción (ej: 'view', 'create', 'update', 'delete')
 * @returns true si el usuario tiene el permiso, false en caso contrario
 *
 * @example
 * ```tsx
 * const canCreate = await checkPermissionServer('empleados', 'documentos-de-empleados', 'create');
 * ```
 */
export async function checkPermissionServer(moduleSlug: string, tabSlug: string, actionSlug: string): Promise<boolean> {
  const supabase = await supabaseServer();
  const session = await getCachedSession();
  const user = session?.user;

  if (!user) {
    logger.error('No authenticated session for permission check');
    return false;
  }

  // Verificar permiso usando la función SQL
  const { data, error } = await supabase.rpc('user_has_permission', {
    p_user_id: user.id,
    p_module_slug: moduleSlug,
    p_tab_slug: tabSlug,
    p_action_slug: actionSlug,
  });

  if (error) {
    logger.error('Error checking user permission', { data: { error } });
    return false;
  }

  return data || false;
}

/**
 * Verifica si el usuario puede ver un tab con lógica de visibilidad inferida (server-side)
 *
 * Si el usuario no tiene permiso explícito de 'view', verifica si tiene acceso a alguna subtab.
 * Esto permite que tabs padre sean visibles si el usuario tiene acceso a alguna de sus subtabs.
 *
 * @param moduleSlug - Slug del módulo
 * @param tabSlug - Slug del tab
 * @returns true si el usuario puede ver el tab (explícito o inferido)
 */
export async function canViewServer(moduleSlug: string, tabSlug: string): Promise<boolean> {
  // 1. Verificar permiso explícito de 'view'
  const hasExplicitView = await checkPermissionServer(moduleSlug, tabSlug, 'view');
  if (hasExplicitView) return true;

  // 2. Verificar visibilidad inferida (si tiene acceso a alguna subtab)
  const moduleDef = PERMISSIONS[moduleSlug as ModuleSlug];
  if (!moduleDef) return false;

  // Helper para encontrar la definición del tab
  const findTabDef = (tabs: any): any => {
    if (tabs[tabSlug]) return tabs[tabSlug];
    for (const key in tabs) {
      if (tabs[key].subtabs) {
        const found = findTabDef(tabs[key].subtabs);
        if (found) return found;
      }
    }
    return null;
  };

  const tabDef = findTabDef(moduleDef.tabs);
  if (!tabDef || !tabDef.subtabs) return false;

  // Helper para verificar si alguna subtab tiene permiso de 'view'
  const hasAnySubtabPermission = async (subtabs: any): Promise<boolean> => {
    for (const key in subtabs) {
      const subtab = subtabs[key];
      // Verificar si esta subtab tiene permiso de 'view'
      const hasView = await checkPermissionServer(moduleSlug, subtab.slug, 'view');
      if (hasView) return true;

      // Recursivamente verificar sus subtabs
      if (subtab.subtabs) {
        const hasSubView = await hasAnySubtabPermission(subtab.subtabs);
        if (hasSubView) return true;
      }
    }
    return false;
  };

  return await hasAnySubtabPermission(tabDef.subtabs);
}

/**
 * Requiere que el usuario tenga un permiso específico (server-side)
 * Lanza un error si el usuario no tiene el permiso
 *
 * Útil para proteger Server Actions
 *
 * @param moduleSlug - Slug del módulo
 * @param tabSlug - Slug del tab o subtab
 * @param actionSlug - Slug de la acción
 * @throws Error si el usuario no tiene el permiso
 *
 * @example
 * ```tsx
 * 'use server';
 *
 * export async function deleteEmployee(id: string) {
 *
 *   // Proceder con la eliminación
 *   await supabase.from('employees').delete().eq('id', id);
 * }
 * ```
 */

/**
 * Obtiene los módulos accesibles para el usuario actual (server-side)
 *
 * @returns Array de módulos a los que el usuario tiene acceso
 */
export async function getUserAccessibleModulesServer() {
  const supabase = await supabaseServer();
  const session = await getCachedSession();

  if (!session?.user) {
    logger.error('No authenticated session for accessible modules');
    return [];
  }

  // Obtener módulos accesibles usando la función SQL
  const { data, error } = await supabase.rpc('get_user_accessible_modules', {
    p_user_id: session.user.id,
  });

  if (error) {
    logger.error('Error fetching accessible modules', { data: { error } });
    return [];
  }

  return data || [];
}
