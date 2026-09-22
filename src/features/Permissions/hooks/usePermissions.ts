'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { UserPermissionRow } from '../actions/permissions.schemas';
import { getUserPermissionsServer } from '../actions/permissions.server';
import { findTabDef } from '../lib/permissions-map-utils';
import { hasInferredView } from '../lib/visibility';
import { PERMISSIONS } from '../permissions-map';

export function usePermissions() {
  const {
    data: permissions = [],
    isLoading,
    error,
  } = useQuery<UserPermissionRow[]>({
    queryKey: ['permissions'],
    queryFn: () => getUserPermissionsServer(),
    staleTime: 5 * 60 * 1000, // 5 minutos - datos se consideran frescos
    gcTime: 30 * 60 * 1000, // 30 minutos - mantener en cache
    refetchOnWindowFocus: false, // NO refetch automático al volver a la ventana
    refetchOnMount: true, // Usar cache si existe (no refetch en cada mount)
    refetchOnReconnect: true, // Solo refetch si se reconecta la red
  });

  // Create a Map for O(1) permission lookups
  const permissionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    permissions.forEach((perm) => {
      const key = `${perm.module_slug}:${perm.tab_slug}:${perm.action_slug}`;
      map.set(key, perm.is_granted === true);
    });
    return map;
  }, [permissions]);

  // Set de "module:tab" con view concedido, para la inferencia de visibilidad por módulo
  const grantedViewByModule = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const perm of permissions) {
      if (perm.action_slug !== 'view' || !perm.is_granted) continue;
      if (!map.has(perm.module_slug)) map.set(perm.module_slug, new Set());
      map.get(perm.module_slug)!.add(perm.tab_slug);
    }
    return map;
  }, [permissions]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (moduleSlug: string, tabSlug: string, actionSlug: string): boolean => {
    const key = `${moduleSlug}:${tabSlug}:${actionSlug}`;
    return permissionMap.get(key) || false;
  };

  /**
   * Convenience helper for view permission with INFERRED VISIBILITY
   * If explicit view permission is missing, checks if user has access to any subtab
   * (lógica pura en `lib/visibility.ts`, misma que usa `canViewServer`).
   */
  const canView = (moduleSlug: string, tabSlug: string): boolean => {
    if (hasPermission(moduleSlug, tabSlug, 'view')) return true;

    const tabDef = findTabDef(PERMISSIONS, moduleSlug, tabSlug);
    const grantedViewTabSlugs = grantedViewByModule.get(moduleSlug) ?? new Set<string>();
    return hasInferredView(tabDef, grantedViewTabSlugs);
  };

  /**
   * Convenience helper for create permission
   */
  const canCreate = (moduleSlug: string, tabSlug: string): boolean => {
    return hasPermission(moduleSlug, tabSlug, 'create');
  };

  /**
   * Convenience helper for update permission
   */
  const canUpdate = (moduleSlug: string, tabSlug: string): boolean => {
    return hasPermission(moduleSlug, tabSlug, 'update');
  };

  /**
   * Convenience helper for delete permission
   */
  const canDelete = (moduleSlug: string, tabSlug: string): boolean => {
    return hasPermission(moduleSlug, tabSlug, 'delete');
  };

  return {
    permissions,
    isLoading,
    error,
    hasPermission,
    canView,
    canCreate,
    canUpdate,
    canDelete,
  };
}
