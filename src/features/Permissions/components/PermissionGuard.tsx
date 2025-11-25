'use client';

import { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import type { ActionSlug, ModuleSlug, SubtabSlug, TabSlug } from '../permissions-map';

/**
 * Props para PermissionGuard con tipado fuerte
 *
 * El tipado permite autocompletado inteligente:
 * - module: Autocompleta todos los módulos disponibles
 * - tab: Autocompleta solo las tabs del módulo seleccionado
 * - action: Autocompleta las 4 acciones (view, create, update, delete)
 */
interface PermissionGuardProps<M extends ModuleSlug = ModuleSlug> {
  module: M;
  tab: TabSlug<M> | SubtabSlug<M, any>;
  action: ActionSlug;
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
}

/**
 * Componente que renderiza condicionalmente sus hijos basado en permisos del usuario
 *
 * Usa TanStack Query con caché de 1 minuto para optimizar performance.
 *
 * @example
 * ```tsx
 * // Ocultar botón si no tiene permiso de crear
 * <PermissionGuard module="empleados" tab="documentos-de-empleados" action="create">
 *   <Button>Crear Documento</Button>
 * </PermissionGuard>
 *
 * // Mostrar mensaje alternativo
 * <PermissionGuard
 *   module="empleados"
 *   tab="docs-empleados-mensuales"
 *   action="view"
 *   fallback={<p>No tienes acceso a documentos mensuales</p>}
 * >
 *   <DocumentsList />
 * </PermissionGuard>
 *
 * // Mostrar skeleton mientras carga
 * <PermissionGuard
 *   module="empleados"
 *   tab="employees"
 *   action="view"
 *   showLoading={true}
 * >
 *   <EmployeesList />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard<M extends ModuleSlug>({
  module,
  tab,
  action,
  children,
  fallback = null,
  showLoading = false,
}: PermissionGuardProps<M>) {
  const { hasPermission, isLoading } = usePermissions();

  // Mostrar loading state si está configurado
  if (isLoading && showLoading) {
    return <div className="animate-pulse bg-muted h-10 rounded" />;
  }

  // No renderizar nada mientras carga (por defecto)
  if (isLoading) {
    return null;
  }

  // Verificar si el usuario tiene el permiso
  const hasAccess = hasPermission(module as string, tab as string, action);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
