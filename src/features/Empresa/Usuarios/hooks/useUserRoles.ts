'use client';

import { getAllRolesWithCounts, getUserRolesServer } from '@/features/Permissions/actions/roles.server';
import { useQuery } from '@tanstack/react-query';

/**
 * Roles de un usuario (`user_roles` con su `roles`). Server action con perímetro de Task 1:
 * el propio usuario o quien tenga `empresa.detalle-usuario.view`.
 */
export const useUserRoles = (userId: string) => {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => getUserRolesServer(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
};

/** Catálogo de roles activos (selector del alta de usuario). */
export const useAllRoles = () => {
  return useQuery({
    queryKey: ['all-roles'],
    queryFn: getAllRolesWithCounts,
    staleTime: 5 * 60 * 1000,
  });
};
