'use client';

import { getAllRolesWithCounts } from '@/features/Permissions/actions/roles.server';
import { useQuery } from '@tanstack/react-query';

/**
 * Catálogo de roles activos (selector del alta de usuario), vía server action de `Permissions`.
 * El hook de roles POR usuario se borró en Task 6: no tenía consumidores; el detalle de usuario
 * usa `getUserRolesServer` desde `UserPermissionsManager`.
 */
export const useAllRoles = () => {
  return useQuery({
    queryKey: ['all-roles'],
    queryFn: getAllRolesWithCounts,
    staleTime: 5 * 60 * 1000,
  });
};
