'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getUserPermissions } from '../actions';

export function usePermissions() {
  const {
    data: permissions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['permissions'],
    queryFn: getUserPermissions,
    staleTime: 0, // Sin caché por ahora
    gcTime: 0, // Sin caché por ahora
    refetchOnWindowFocus: true,
  });

  // Create a Map for O(1) permission lookups
  const permissionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    permissions.forEach((perm: any) => {
      const key = `${perm.module_slug}:${perm.tab_slug}:${perm.action_slug}`;
      map.set(key, perm.is_granted !== false);
    });
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
   * Convenience helper for view permission
   */
  const canView = (moduleSlug: string, tabSlug: string): boolean => {
    return hasPermission(moduleSlug, tabSlug, 'view');
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
