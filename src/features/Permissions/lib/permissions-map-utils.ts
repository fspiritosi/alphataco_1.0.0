/**
 * Utilidades puras sobre la forma del mapa de permisos (`permissions-map.ts`).
 * Sin I/O: sólo recorren el objeto en memoria. Se extraen acá para poder testear
 * la búsqueda de definiciones de tab con Vitest, sin mockear sesión ni base de datos.
 */

/** Forma mínima de una tab/subtab del mapa de permisos que necesita este módulo. */
export interface TabDefLike {
  slug: string;
  subtabs?: Record<string, TabDefLike>;
}

/** Forma mínima de un módulo del mapa de permisos. */
export interface ModuleDefLike {
  tabs: Record<string, TabDefLike>;
}

/**
 * Busca recursivamente la definición de una tab o subtab (a cualquier profundidad)
 * dentro de un módulo del mapa de permisos.
 *
 * @param map mapa completo de módulos (ej. `PERMISSIONS` de `permissions-map.ts`)
 * @param moduleSlug slug del módulo donde buscar
 * @param tabSlug slug de la tab o subtab buscada
 * @returns la definición de la tab, o `null` si el módulo o la tab no existen
 */
export function findTabDef<M extends ModuleDefLike>(
  map: Record<string, M>,
  moduleSlug: string,
  tabSlug: string
): TabDefLike | null {
  const moduleDef = map[moduleSlug];
  if (!moduleDef) return null;
  return findTabDefInTabs(moduleDef.tabs, tabSlug);
}

function findTabDefInTabs(tabs: Record<string, TabDefLike>, tabSlug: string): TabDefLike | null {
  if (tabs[tabSlug]) return tabs[tabSlug];

  for (const key in tabs) {
    const subtabs = tabs[key].subtabs;
    if (subtabs) {
      const found = findTabDefInTabs(subtabs, tabSlug);
      if (found) return found;
    }
  }

  return null;
}
