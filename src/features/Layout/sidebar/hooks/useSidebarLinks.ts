'use client';

import { useMemo } from 'react';
import { navigationLinks } from '../constants/navigation';

interface AccessibleModule {
  module_slug: string;
  module_name: string;
  module_icon: string;
  module_id: string;
}

/**
 * Hook para filtrar y ordenar los links del sidebar según los módulos accesibles
 *
 * @param accessibleModules - Array de módulos a los que el usuario tiene acceso
 * @returns Array de links filtrados y ordenados
 */
export function useSidebarLinks(accessibleModules: AccessibleModule[]) {
  return useMemo(() => {
    // Filtrar links según módulos accesibles
    const filtered = navigationLinks.filter((link) =>
      accessibleModules.some((mod) => mod.module_slug === link.moduleSlug)
    );

    // Ordenar por position
    return filtered.sort((a, b) => a.position - b.position);
  }, [accessibleModules]);
}
