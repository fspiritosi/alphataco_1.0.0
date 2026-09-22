/**
 * Política de acceso a los catálogos de Equipos sin RLS (módulo puro, testeado).
 *
 * `type`, `sub_type`, `brand_vehicles` y `equipment_owners` tienen `company_id` **nullable**:
 * las filas con `company_id IS NULL` son **globales** y las comparten todas las empresas.
 *
 * - Lectura: globales + propias (una empresa tiene que poder elegir una marca global al dar de
 *   alta un equipo).
 * - Escritura: sólo propias. Editar o desactivar una fila global desde una empresa cambiaría el
 *   catálogo de todas las demás.
 * - De otra empresa: no existen (`not_found`, sin revelar que existen).
 *
 * Mismo criterio que `Documentacion/TiposDocumentos/lib/document-type-policy.ts`.
 *
 * Los catálogos con `company_id` NOT NULL (`model_vehicles`, `type_hitch_types`) NO usan este
 * módulo: van con `withCompany` a secas.
 */
export type CatalogAccessMode = 'read' | 'write';
export type CatalogAccess = 'ok' | 'not_found' | 'global_read_only';

export const GLOBAL_CATALOG_READ_ONLY = 'Los catálogos globales no se editan desde una empresa';

/** `where` de lectura: globales + propios. */
export function catalogReadScope(companyId: string): { OR: [{ company_id: null }, { company_id: string }] } {
  return { OR: [{ company_id: null }, { company_id: companyId }] };
}

/** `where` de escritura: sólo propios. */
export function catalogWriteScope(companyId: string): { company_id: string } {
  return { company_id: companyId };
}

/** Decide el acceso a una fila (o a su ausencia) según el modo. */
export function resolveCatalogAccess(
  row: { company_id: string | null } | null | undefined,
  companyId: string,
  mode: CatalogAccessMode
): CatalogAccess {
  if (!row) return 'not_found';
  if (row.company_id === companyId) return 'ok';
  if (row.company_id === null) return mode === 'read' ? 'ok' : 'global_read_only';
  return 'not_found';
}

/** Traduce el resultado de `resolveCatalogAccess` al mensaje de error del usuario. */
export function catalogAccessError(access: CatalogAccess, notFoundMessage: string): string | null {
  if (access === 'ok') return null;
  if (access === 'global_read_only') return GLOBAL_CATALOG_READ_ONLY;
  return notFoundMessage;
}
