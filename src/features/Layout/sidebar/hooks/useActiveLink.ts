'use client';

import { useMemo } from 'react';
import { NavigationLink } from '../constants/navigation';
import { createLinkRegex, findBestMatch } from '../utils/sidebar.utils';

/**
 * Hook para detectar el link activo basándose en el pathname actual
 *
 * El match (regex por link + el más específico gana) vive en `sidebar.utils`, que es
 * lógica pura con test propio; acá sólo se memoiza.
 *
 * @param links - Array de links del sidebar
 * @param pathname - Pathname actual de la ruta
 * @returns Nombre del link activo
 */
export function useActiveLink(links: NavigationLink[], pathname: string): string {
  return useMemo(() => {
    const linksWithRegex = links.map((link) => ({ ...link, regex: createLinkRegex(link.href.toString()) }));

    return findBestMatch(linksWithRegex, pathname);
  }, [links, pathname]);
}
