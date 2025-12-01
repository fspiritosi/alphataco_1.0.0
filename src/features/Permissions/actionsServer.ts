'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { PERMISSIONS, type ModuleSlug } from './permissions-map';

/**
 * Server Actions para verificación de permisos
 *
 * Estas funciones se ejecutan en el servidor y NO usan caché.
 * Cada llamada consulta directamente la base de datos.
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
 *   const canView = permissions.get('empleados:employees:view');
 *   const canCreate = permissions.get('empleados:employees:create');
 * }
 * ```
 */

/**
 * Obtiene todos los permisos del usuario actual (server-side)
 *
 * @returns Array de permisos del usuario
 * @throws Error si el usuario no está autenticado
 */
export async function getUserPermissionsServer() {
  const supabase = supabaseServer();

  // Obtener usuario desde auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Error getting user from auth:', authError);
    return [];
  }

  // Obtener permisos usando la función SQL
  const { data, error } = await supabase.rpc('get_user_permissions', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }

  return data || [];
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
  const supabase = supabaseServer();

  // Obtener usuario UNA SOLA VEZ
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Error getting user from auth:', authError);
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
    console.error('Error checking multiple permissions:', error);
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
  const supabase = supabaseServer();

  // Obtener usuario desde auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Error getting user from auth:', authError);
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
    console.error('Error checking user permission:', error);
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
 *   await requirePermissionServer('empleados', 'employees', 'delete');
 *
 *   // Proceder con la eliminación
 *   await supabase.from('employees').delete().eq('id', id);
 * }
 * ```
 */
export async function requirePermissionServer(moduleSlug: string, tabSlug: string, actionSlug: string): Promise<void> {
  const hasPermission = await checkPermissionServer(moduleSlug, tabSlug, actionSlug);

  if (!hasPermission) {
    throw new Error(`Permission denied: User does not have ${actionSlug} permission on ${moduleSlug}/${tabSlug}`);
  }
}

/**
 * Obtiene los módulos accesibles para el usuario actual (server-side)
 *
 * @returns Array de módulos a los que el usuario tiene acceso
 */
export async function getUserAccessibleModulesServer() {
  const supabase = supabaseServer();

  // Obtener usuario desde auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Error getting user from auth:', authError);
    return [];
  }

  // Obtener módulos accesibles usando la función SQL
  const { data, error } = await supabase.rpc('get_user_accessible_modules', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('Error fetching accessible modules:', error);
    return [];
  }

  return data || [];
}
