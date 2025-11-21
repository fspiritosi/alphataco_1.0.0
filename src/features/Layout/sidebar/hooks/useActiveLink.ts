'use client';

import { useMemo } from 'react';
import { NavigationLink } from '../constants/navigation';

/**
 * Hook para detectar el link activo basándose en el pathname actual
 *
 * Usa regex para encontrar el mejor match (más específico)
 *
 * @param links - Array de links del sidebar
 * @param pathname - Pathname actual de la ruta
 * @returns Nombre del link activo
 */
export function useActiveLink(links: NavigationLink[], pathname: string): string {
  return useMemo(() => {
    // Crear regex para cada link
    const linksWithRegex = links.map((link) => {
      const href = link.href.toString();
      const regexPattern = new RegExp(`^${href.replace(/\//g, '\\/')}(\/|$)`);
      return {
        ...link,
        regex: regexPattern,
      };
    });

    // Encontrar el mejor match (más específico)
    const bestMatch = linksWithRegex.reduce(
      (best: { link: any; matchLength: number }, link: any) => {
        const match = pathname.match(link.regex);
        const matchLength = match ? match[0].length : 0;
        return matchLength > best.matchLength ? { link, matchLength } : best;
      },
      { link: null, matchLength: 0 }
    );

    return bestMatch.link?.name || '';
  }, [links, pathname]);
}
