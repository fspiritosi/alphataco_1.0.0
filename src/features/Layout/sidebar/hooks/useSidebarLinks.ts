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
 * Módulos siempre visibles en la sidebar para cualquier usuario autenticado,
 * incluso si no figuran en `accessibleModules`. Útil para secciones globales
 * como el Centro de Ayuda, que no tienen tabs/role_permissions cargados en BD.
 */
const ALWAYS_VISIBLE_MODULE_SLUGS = new Set<string>(['ayuda']);

/**
 * Hook para filtrar y ordenar los links del sidebar según los módulos accesibles
 *
 * @param accessibleModules - Array de módulos a los que el usuario tiene acceso
 * @returns Array de links filtrados y ordenados
 */
export function useSidebarLinks(accessibleModules: AccessibleModule[]) {
  return useMemo(() => {
    // Filtrar links según módulos accesibles, dejando pasar los que están en la lista de siempre-visibles.
    const filtered = navigationLinks.filter(
      (link) =>
        ALWAYS_VISIBLE_MODULE_SLUGS.has(link.moduleSlug) ||
        accessibleModules.some((mod) => mod.module_slug === link.moduleSlug)
    );

    // Ordenar por position
    return filtered.sort((a, b) => a.position - b.position);
  }, [accessibleModules]);
}
