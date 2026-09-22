/**
 * Plan de escritura de una subida de documento (módulo puro).
 *
 * Semántica legacy conservada: la unidad es `(recurso, tipo, período)`, NO `(recurso, tipo)`.
 * Un tipo mensual (o no obligatorio) admite varias filas por recurso, una por período; el
 * período de un permanente es `null`. Para cada recurso pedido:
 * - sin fila para ese período → `toCreate`;
 * - fila vigente `presentado`/`aprobado` con archivo → `alreadyUploaded` (no se pisa: N=1 lo
 *   informa como error, el flujo multirecurso la ignora);
 * - fila `pendiente`, `rechazado`, `vencido` o archivada ("ya no aplica") → `toUpdate`
 *   (el llamador la reactiva con `archived_at = null` y conserva el período existente).
 */
export interface ExistingDocumentRow {
  applies: string | null;
  state: string | null;
  document_path: string | null;
  period: string | null;
  archived_at: Date | null;
}

export interface DocumentWritePlan {
  toUpdate: string[];
  toCreate: string[];
  alreadyUploaded: string[];
}

/** Período normalizado para comparar y persistir: permanentes → `null`. */
export function normalizePeriod(period: string | undefined | null): string | null {
  return period ? period : null;
}

function isUploaded(row: ExistingDocumentRow): boolean {
  return (
    row.document_path !== null && row.archived_at === null && (row.state === 'presentado' || row.state === 'aprobado')
  );
}

export function planDocumentWrites(
  existing: readonly ExistingDocumentRow[],
  appliesIds: readonly string[],
  period: string | undefined | null
): DocumentWritePlan {
  const target = normalizePeriod(period);
  const byResource = new Map<string, ExistingDocumentRow[]>();
  for (const row of existing) {
    if (!row.applies || normalizePeriod(row.period) !== target) continue;
    const rows = byResource.get(row.applies) ?? [];
    rows.push(row);
    byResource.set(row.applies, rows);
  }

  const plan: DocumentWritePlan = { toUpdate: [], toCreate: [], alreadyUploaded: [] };
  for (const id of appliesIds) {
    const rows = byResource.get(id);
    if (!rows || rows.length === 0) {
      plan.toCreate.push(id);
    } else if (rows.some(isUploaded)) {
      plan.alreadyUploaded.push(id);
    } else {
      plan.toUpdate.push(id);
    }
  }
  return plan;
}
