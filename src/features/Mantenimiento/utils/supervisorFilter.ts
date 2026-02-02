'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';

const logger = new Logger('Mantenimiento/supervisorFilter');

/**
 * Información del usuario actual y si puede ver todas las solicitudes
 */
export interface SupervisorFilterInfo {
  /** ID del usuario actual */
  userId: string;
  /** Si el usuario tiene permiso para ver todas las solicitudes (view_all_requests) */
  hasViewAllPermission: boolean;
  /** Si el usuario NO tiene el permiso, se debe filtrar por supervisor_id = userId */
  shouldFilterBySupervisor: boolean;
}

/**
 * Obtiene la información necesaria para aplicar el filtro de supervisor.
 *
 * Reglas:
 * - Si el usuario tiene el permiso 'view_all_requests' en alguna tab de operaciones → puede ver TODAS las solicitudes
 * - Si el usuario NO tiene el permiso → solo ve solicitudes donde supervisor_id = su user_id
 *
 * @returns SupervisorFilterInfo con la información del usuario y si debe aplicar filtro
 */
export async function getSupervisorFilterInfo(): Promise<SupervisorFilterInfo | null> {
  const supabase = await supabaseServer();

  // Obtener usuario actual
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    logger.warn('No se pudo obtener el usuario actual', { data: { error: authError } });
    return null;
  }

  // Verificar si tiene el permiso view_all_requests en alguna de las tabs de operaciones de mantenimiento
  const { data: permissions, error: permError } = await supabase.rpc('get_user_permissions', {
    p_user_id: user.id,
  });

  if (permError) {
    logger.error('Error al obtener permisos del usuario', { data: { error: permError, userId: user.id } });
    // En caso de error, asumir que NO tiene el permiso (más restrictivo)
    return {
      userId: user.id,
      hasViewAllPermission: false,
      shouldFilterBySupervisor: true,
    };
  }

  // Tabs de operaciones de mantenimiento que usan este filtro
  const operationsTabs = ['maintenance_requests', 'pendientes_ejecutar', 'para_taller'];

  // Verificar si tiene el permiso view_all_requests en alguna de estas tabs
  const hasViewAllPermission =
    permissions?.some(
      (p: { action_slug: string; tab_slug: string }) =>
        p.action_slug === 'view_all_requests' && operationsTabs.includes(p.tab_slug)
    ) ?? false;

  logger.debug('Información de filtro de supervisor', {
    data: {
      userId: user.id,
      hasViewAllPermission,
      permissionsCount: permissions?.length || 0,
    },
  });

  return {
    userId: user.id,
    hasViewAllPermission,
    shouldFilterBySupervisor: !hasViewAllPermission,
  };
}

/**
 * Aplica el filtro de supervisor a un array de solicitudes de mantenimiento.
 * Útil cuando ya tienes los datos y quieres filtrar en memoria.
 *
 * @param requests Array de solicitudes que tienen supervisor_id
 * @param filterInfo Información del filtro obtenida con getSupervisorFilterInfo
 * @returns Array filtrado (o el mismo array si el usuario puede ver todo)
 */
export async function applySupervisorFilter<T extends { supervisor_id?: string | null }>(
  requests: T[],
  filterInfo: SupervisorFilterInfo | null
): Promise<T[]> {
  // Si no hay info de filtro o el usuario tiene permiso para ver todo, retornar todo
  if (!filterInfo || filterInfo.hasViewAllPermission) {
    return requests;
  }

  // Filtrar solo las solicitudes asignadas al supervisor
  return requests.filter((request) => request.supervisor_id === filterInfo.userId);
}
