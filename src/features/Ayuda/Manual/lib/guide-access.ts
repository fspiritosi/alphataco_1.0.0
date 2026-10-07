import { createTabVisibilityChecker } from '@/features/Permissions/lib/tab-visibility';
import type { LoadedGuide } from './manual-loader';

/**
 * Qué guías puede abrir el usuario. Usa la MISMA regla que el sidebar y las secciones
 * (`createTabVisibilityChecker`): si una pantalla no aparece en el menú, su guía tampoco aparece
 * en el manual, ni en la búsqueda, ni en anterior/siguiente, ni en el botón "?".
 *
 * Sin `ayuda:manual` no se ve ninguna. Las guías generales (sin `access`) las ve cualquiera que
 * pueda abrir el manual; las demás, quien vea al menos una de sus tabs.
 */
export function createGuideAccess(permissions: Readonly<Record<string, boolean>>) {
  const isTabVisible = createTabVisibilityChecker(permissions);
  const canOpenManual = isTabVisible('ayuda', 'manual');

  return function canOpenGuide(guide: Pick<LoadedGuide, 'access'>): boolean {
    if (!canOpenManual) return false;
    if (!guide.access?.length) return true;
    return guide.access.some((ref) => isTabVisible(ref.module, ref.tab));
  };
}

export function visibleGuides(guides: LoadedGuide[], permissions: Readonly<Record<string, boolean>>): LoadedGuide[] {
  const canOpen = createGuideAccess(permissions);
  return guides.filter(canOpen);
}
