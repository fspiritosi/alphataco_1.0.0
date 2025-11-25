import { ReactNode } from 'react';
import { checkPermissionServer } from '../actionsServer';
import type { ActionSlug, ModuleSlug, SubtabSlug, TabSlug } from '../permissions-map';

interface PermissionGuardServerProps<M extends ModuleSlug = ModuleSlug> {
  module: M;
  tab: TabSlug<M> | SubtabSlug<M, any>;
  action: ActionSlug;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente Server que renderiza condicionalmente sus hijos basado en permisos del usuario
 *
 * Este componente se ejecuta en el servidor y NO usa caché.
 * Cada render consulta directamente la base de datos.
 *
 * @example
 * import { PermissionGuardServer } from '@/features/Permissions';
 *
 * export default async function EmployeesPage() {
 *   return (
 *     <PermissionGuardServer module="empleados" tab="employees" action="create">
 *       <Button>Crear Empleado</Button>
 *     </PermissionGuardServer>
 *   );
 * }
 */
export async function PermissionGuardServer<M extends ModuleSlug>({
  module,
  tab,
  action,
  children,
  fallback = null,
}: PermissionGuardServerProps<M>) {
  const hasPermission = await checkPermissionServer(module as string, tab as string, action);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
