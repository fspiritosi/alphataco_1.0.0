/**
 * Política de acceso a `document_types` sin RLS (módulo puro, testeado).
 *
 * - **Globales** (`company_id IS NULL`): los comparten todas las empresas. Se LEEN (listados,
 *   edición en sólo lectura, subida de documentos, verificación de consistencia) pero NO se
 *   editan, desactivan, reactivan ni eliminan desde una empresa: cualquiera de esas acciones
 *   tendría efectos en las alertas y documentos de las demás empresas.
 * - **Propios** (`company_id = empresa activa`): lectura y escritura completas.
 * - **De otra empresa**: no existen para la empresa activa (`not_found`, sin revelar que existen).
 */
export type DocumentTypeAccessMode = 'read' | 'write';
export type DocumentTypeAccess = 'ok' | 'not_found' | 'global_read_only';

export const GLOBAL_DOCUMENT_TYPE_READ_ONLY = 'Los tipos de documento globales no se editan desde una empresa';

/** `where` de lectura: globales + propios. */
export function documentTypeReadScope(companyId: string): { OR: [{ company_id: null }, { company_id: string }] } {
  return { OR: [{ company_id: null }, { company_id: companyId }] };
}

/** `where` de escritura: sólo propios. */
export function documentTypeWriteScope(companyId: string): { company_id: string } {
  return { company_id: companyId };
}

/** Decide el acceso a una fila (o a su ausencia) según el modo. */
export function resolveDocumentTypeAccess(
  row: { company_id: string | null } | null,
  companyId: string,
  mode: DocumentTypeAccessMode
): DocumentTypeAccess {
  if (!row) return 'not_found';
  if (row.company_id === companyId) return 'ok';
  if (row.company_id === null) return mode === 'read' ? 'ok' : 'global_read_only';
  return 'not_found';
}
