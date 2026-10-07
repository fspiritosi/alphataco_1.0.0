import type { ScreenRef } from '../catalog/types.ts';

/**
 * Tabla pantalla → guía del botón "?", derivada de `screens` del catálogo (no es un mapa aparte).
 * Liviana y sin dependencias de servidor: viaja al cliente ya filtrada por permisos.
 */
export type RouteRule = ScreenRef & { slug: string };

export function buildRouteTable(guides: { slug: string; screens?: ScreenRef[] }[]): RouteRule[] {
  return guides.flatMap((guide) => (guide.screens ?? []).map((screen) => ({ ...screen, slug: guide.slug })));
}

/** `…/*`: cualquier página hija de esa ruta, pero no la ruta misma. */
export function isWildcardPath(path: string): boolean {
  return path.endsWith('/*');
}

/** Primera pantalla que se puede abrir tal cual (las `…/*` necesitan un id que no tenemos). */
export function firstConcreteScreen<S extends ScreenRef>(screens: S[] | undefined): S | undefined {
  return screens?.find((screen) => !isWildcardPath(screen.path));
}

function pathMatches(rulePath: string, pathname: string): boolean {
  if (isWildcardPath(rulePath)) {
    const base = rulePath.slice(0, -2);
    return pathname.startsWith(`${base}/`);
  }
  if (pathname === rulePath) return true;
  // `/dashboard` es la raíz de todo: sólo vale exacta, si no ganaría en cualquier pantalla.
  if (rulePath === '/dashboard') return false;
  return pathname.startsWith(`${rulePath}/`);
}

/**
 * Guía para la pantalla actual. Gana la ruta más larga (las páginas de detalle heredan la guía de
 * su módulo por prefijo) y, a igual ruta, la que además coincide en `tab` y `subtab`. Una regla
 * que declara `tab` sólo aplica si la URL trae ese `tab`.
 */
export function matchGuide(
  rules: RouteRule[],
  pathname: string,
  params: { tab?: string | null; subtab?: string | null }
): string | null {
  let best: { rule: RouteRule; score: number } | null = null;

  for (const rule of rules) {
    if (!pathMatches(rule.path, pathname)) continue;
    if (rule.tab && rule.tab !== params.tab) continue;
    if (rule.subtab && rule.subtab !== params.subtab) continue;

    const score = rule.path.length * 100 + (rule.tab ? 10 : 0) + (rule.subtab ? 1 : 0);
    if (!best || score > best.score) best = { rule, score };
  }

  return best?.rule.slug ?? null;
}
