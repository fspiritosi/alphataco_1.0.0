'use server';

import { supabaseServer } from '@/lib/supabase/server';

/**
 * Server Actions para verificación de permisos
 *
 * Estas funciones se ejecutan en el servidor y NO usan caché.
 * Cada llamada consulta directamente la base de datos.
 *
 * Uso en Server Components:
 * ```tsx
 * import { checkPermissionServer } from '@/features/Permissions/actionsServer';
 *
 * export default async function MyPage() {
 *   const canCreate = await checkPermissionServer('empleados', 'documentos-de-empleados', 'create');
 *
 *   return (
 *     <div>
 *       {canCreate && <Button>Crear</Button>}
 *     </div>
 *   );
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
 * Verifica si el usuario actual tiene un permiso específico (server-side)
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
