import type { ScreenRef } from '../catalog/types';
import { isWildcardPath } from './route-table';

/**
 * Todas las URLs del manual se arman acá: si algún día el manual pasa a una subruta propia, se
 * cambia esta función y nada más.
 */
export function manualHref(slug?: string, anchor?: string): string {
  const base = '/dashboard/help?tab=manual';
  if (!slug) return base;
  return `${base}&guide=${encodeURIComponent(slug)}${anchor ? `#${anchor}` : ''}`;
}

/** URL de una pantalla del sistema a partir de su referencia en el catálogo. */
export function screenHref(screen: ScreenRef): string {
  if (isWildcardPath(screen.path)) throw new Error(`screenHref: ${screen.path} no es una pantalla concreta`);
  const params = new URLSearchParams();
  if (screen.tab) params.set('tab', screen.tab);
  if (screen.subtab) params.set('subtab', screen.subtab);
  const query = params.toString();
  return query ? `${screen.path}?${query}` : screen.path;
}
