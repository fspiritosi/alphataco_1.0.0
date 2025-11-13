'use client';

import { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGuardProps {
  moduleSlug: string;
  tabSlug: string;
  actionSlug: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 *
 * @example
 * <PermissionGuard moduleSlug="users" tabSlug="list" actionSlug="create">
 *   <Button>Create User</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({ moduleSlug, tabSlug, actionSlug, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission, isLoading } = usePermissions();

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // Check if user has the required permission
  const hasAccess = hasPermission(moduleSlug, tabSlug, actionSlug);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
