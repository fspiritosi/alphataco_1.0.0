import type { AllTabSlugsUnion, ModuleSlug } from '../../../Permissions/permissions-map.ts';
import type { SectionDef, TabRef } from './types.ts';

/**
 * Referencia a una tab o subtab del mapa de permisos. El segundo argumento se valida contra
 * `permissions-map.ts` al compilar: una tab mal escrita o borrada rompe `check-types`.
 */
export function tab<M extends ModuleSlug>(module: M, tabSlug: AllTabSlugsUnion<M>): TabRef {
  return { module, tab: tabSlug as string };
}

/** Identidad tipada: deja escribir cada sección en su archivo con autocompletado. */
export function defineSection(section: SectionDef): SectionDef {
  return section;
}
