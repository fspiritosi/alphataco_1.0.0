import { NavigationLink } from '../constants/navigation';

/**
 * Crea una expresión regular para matching de rutas
 *
 * @param href - URL del link
 * @returns RegExp para matching
 */
export function createLinkRegex(href: string): RegExp {
  return new RegExp(`^${href.replace(/\//g, '\\/')}(\/|$)`);
}

/**
 * Encuentra el mejor match entre links y pathname
 *
 * @param links - Array de links con regex
 * @param pathname - Pathname actual
 * @returns Nombre del link con mejor match
 */
export function findBestMatch(links: Array<NavigationLink & { regex: RegExp }>, pathname: string): string {
  type Best = { link: NavigationLink | null; matchLength: number };

  const bestMatch = links.reduce<Best>(
    (best, link) => {
      const match = pathname.match(link.regex);
      const matchLength = match ? match[0].length : 0;
      return matchLength > best.matchLength ? { link, matchLength } : best;
    },
    { link: null, matchLength: 0 }
  );

  return bestMatch.link?.name || '';
}
