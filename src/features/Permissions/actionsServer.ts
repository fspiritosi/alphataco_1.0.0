/**
 * Re-export de compatibilidad: la implementación real de las Server Actions de
 * verificación de permisos vive en `./actions/permissions.server.ts` (capa única,
 * P2 — Task 1). Este módulo sólo reexporta para no romper los imports existentes
 * (`@/features/Permissions/actionsServer`, usado en ~18 archivos fuera de esta carpeta).
 */
export {
  canViewServer,
  checkMultiplePermissionsServer,
  checkPermissionServer,
  getUserAccessibleModulesServer,
  getUserPermissionsMapServer,
  getUserPermissionsServer,
} from './actions/permissions.server';
