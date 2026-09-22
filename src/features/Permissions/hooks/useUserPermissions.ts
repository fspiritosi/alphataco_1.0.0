'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getUserPermissionsServer,
  getUserRolesServer,
  type UserPermissionsData,
  type UserRolesData,
} from '../actions/roles.server';

export function useUserPermissions(userId: string) {
  const permissionsQuery = useQuery<UserPermissionsData>({
    queryKey: ['user-permissions', userId],
    queryFn: () => getUserPermissionsServer(userId),
    enabled: !!userId,
    staleTime: 0, // Sin caché para ver cambios inmediatos
  });

  const rolesQuery = useQuery<UserRolesData>({
    queryKey: ['user-roles', userId],
    queryFn: () => getUserRolesServer(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    permissions: permissionsQuery.data || [],
    roles: rolesQuery.data || [],
    isLoading: permissionsQuery.isLoading || rolesQuery.isLoading,
    error: permissionsQuery.error || rolesQuery.error,
    refetch: () => {
      permissionsQuery.refetch();
      rolesQuery.refetch();
    },
  };
}
