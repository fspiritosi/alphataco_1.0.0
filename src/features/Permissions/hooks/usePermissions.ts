'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getUserPermissions } from '../actions';
import { PERMISSIONS, type ModuleSlug } from '../permissions-map';

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
   * Helper to check inferred permission (if any child is accessible)
   */
  const checkInferredPermission = (moduleSlug: string, tabSlug: string): boolean => {
    const moduleDef = PERMISSIONS[moduleSlug as ModuleSlug];
    if (!moduleDef) return false;

    // Helper to find the tab definition
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

    // Helper to check if any subtab has permission
    const hasAnySubtabPermission = (subtabs: any): boolean => {
      for (const key in subtabs) {
        const subtab = subtabs[key];
        // Check if this subtab has 'view' permission
        if (hasPermission(moduleSlug, subtab.slug, 'view')) return true;

        // Recursively check its subtabs
        if (subtab.subtabs && hasAnySubtabPermission(subtab.subtabs)) return true;
      }
      return false;
    };

    return hasAnySubtabPermission(tabDef.subtabs);
  };

  /**
   * Convenience helper for view permission with INFERRED VISIBILITY
   * If explicit view permission is missing, checks if user has access to any subtab
   */
  const canView = (moduleSlug: string, tabSlug: string): boolean => {
    // 1. Check explicit permission
    if (hasPermission(moduleSlug, tabSlug, 'view')) {
      return true;
    }

    // 2. Check inferred permission (if any child is accessible)
    return checkInferredPermission(moduleSlug, tabSlug);
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
