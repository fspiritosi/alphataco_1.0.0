'use client';

import { useQuery } from '@tanstack/react-query';
import { getUserPermissionsByUserId, getUserPermissionsByUserIdType, getUserRoles, getUserRolesType } from '../actions';

export function useUserPermissions(userId: string) {
  const permissionsQuery = useQuery<getUserPermissionsByUserIdType>({
    queryKey: ['user-permissions', userId],
    queryFn: () => getUserPermissionsByUserId(userId),
    enabled: !!userId,
    staleTime: 0, // Sin caché para ver cambios inmediatos
  });

  const rolesQuery = useQuery<getUserRolesType>({
    queryKey: ['user-roles', userId],
    queryFn: () => getUserRoles(userId),
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
