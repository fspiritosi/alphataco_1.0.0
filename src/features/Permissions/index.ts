/**
 * Sistema de Permisos - Exports centralizados
 *
 * Este archivo exporta todos los componentes, hooks y utilidades
 * del sistema de permisos para facilitar su importación.
 */

// Componentes
export { PermissionGuard } from './components/PermissionGuard';
export { PermissionGuardServer } from './components/PermissionGuardServer';

// Hooks
export { usePermissions } from './hooks/usePermissions';

// Actions (Client)
export {
  assignRoleToUser,
  checkUserPermission,
  createRole,
  deleteRole,
  getModulesWithTabs,
  getRolePermissions,
  getRoles,
  getUserAccessibleModules,
  getUserPermissions,
  getUserPermissionsByUserId,
  getUserRoles,
  removeRoleFromUser,
  removeUserPermission,
  requirePermission,
  setRolePermissions,
  setUserPermission,
  updateRole,
} from './actions';

// Actions (Server)
export {
  checkPermissionServer,
  getUserAccessibleModulesServer,
  getUserPermissionsServer,
  requirePermissionServer,
} from './actionsServer';

// Mapa de permisos y tipos
export { ACTIONS, PERMISSIONS, getSubtabId, getTabId } from './permissions-map';
export type { ActionSlug, ModuleSlug, SubtabSlug, TabSlug } from './permissions-map';
