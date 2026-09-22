import type { TabDefLike } from './permissions-map-utils';

/**
 * Inferencia de visibilidad de una tab con subtabs: pura, sin I/O.
 *
 * Una tab padre se considera visible aunque el usuario NO tenga permiso `view`
 * explícito sobre ella, si tiene `view` sobre alguna de sus subtabs (a cualquier
 * profundidad). El caller resuelve primero el conjunto de slugs con `view` concedido
 * (una sola consulta a la BD) y esta función sólo recorre la estructura en memoria.
 *
 * @param tabDef definición de la tab (con `subtabs`, si tiene), o `null`/`undefined`
 * @param grantedViewTabSlugs slugs de tabs sobre los que el usuario tiene `view` concedido
 * @returns `true` si alguna subtab (a cualquier nivel) está en `grantedViewTabSlugs`
 */
export function hasInferredView(tabDef: TabDefLike | null | undefined, grantedViewTabSlugs: ReadonlySet<string>): boolean {
  if (!tabDef?.subtabs) return false;

  for (const subtab of Object.values(tabDef.subtabs)) {
    if (grantedViewTabSlugs.has(subtab.slug)) return true;
    if (hasInferredView(subtab, grantedViewTabSlugs)) return true;
  }

  return false;
}
