/**
 * Agrupación de los clones previos ("conflictos") de un parte diario.
 *
 * Módulo puro: recibe las filas ya leídas de la base y el mapa `dailyreport.id → fecha`,
 * y arma la respuesta que consume `CloneRowsConflictView`. Sin Prisma ni `server-only`,
 * para poder testear la agrupación sin base de datos.
 */

/** Tipo de servicio de una línea de parte diario. */
export type CloneTypeService = 'mensual' | 'adicional' | 'adicional_permanente';

/** Fila duplicada tal como la deja la query de Prisma, ya aplanada. */
export interface DuplicatedRow {
  id: string;
  cloned_from_row_id: string | null;
  daily_report_id: string | null;
  customerName: string | null;
  serviceName: string | null;
  itemName: string | null;
  sectorName: string | null;
  areaName: string | null;
  workingDay: string | null;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  typeService: CloneTypeService | null;
  clonedAt: string | null;
}

export interface CloneConflictRow {
  id: string;
  cloned_from_row_id: string;
  customerName: string | null;
  serviceName: string | null;
  itemName: string | null;
  sectorName: string | null;
  areaName: string | null;
  workingDay: string | null;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  typeService: CloneTypeService | null;
  clonedAt: string | null;
}

export interface CloneConflictsByDate {
  /** targetDate (YYYY-MM-DD) → conflictos en esa fecha. Solo fechas con al menos un conflicto. */
  conflicts: Record<string, CloneConflictRow[]>;
  /** Total sumado de todos los conflictos. */
  totalCount: number;
  /** Para el botón "Excluir duplicados": targetDate → ids de las filas ORIGEN ya clonadas ahí. */
  skipMap: Record<string, string[]>;
}

/**
 * Formatea una columna `time` de Postgres (que Prisma entrega como `Date` sobre 1970-01-01 UTC)
 * como `HH:mm`. Se lee en UTC para que la zona horaria local no corra la hora.
 */
export function formatUtcTime(value: Date | null): string | null {
  if (!value) return null;
  const hh = String(value.getUTCHours()).padStart(2, '0');
  const mm = String(value.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Agrupa las filas duplicadas por fecha destino. Descarta las que no tienen origen
 * (`cloned_from_row_id`) o cuyo parte destino no está en `reportIdToDate`.
 */
export function findCloneConflicts(
  duplicatedRows: readonly DuplicatedRow[],
  reportIdToDate: ReadonlyMap<string, string>
): CloneConflictsByDate {
  const conflicts: Record<string, CloneConflictRow[]> = {};
  const skipMap: Record<string, string[]> = {};

  for (const dup of duplicatedRows) {
    if (!dup.daily_report_id || !dup.cloned_from_row_id) continue;
    const targetDate = reportIdToDate.get(dup.daily_report_id);
    if (!targetDate) continue;

    const conflictRow: CloneConflictRow = {
      id: dup.id,
      cloned_from_row_id: dup.cloned_from_row_id,
      customerName: dup.customerName,
      serviceName: dup.serviceName,
      itemName: dup.itemName,
      sectorName: dup.sectorName,
      areaName: dup.areaName,
      workingDay: dup.workingDay,
      startTime: dup.startTime,
      endTime: dup.endTime,
      description: dup.description,
      typeService: dup.typeService,
      clonedAt: dup.clonedAt,
    };

    (conflicts[targetDate] ??= []).push(conflictRow);

    const skipForDate = (skipMap[targetDate] ??= []);
    if (!skipForDate.includes(dup.cloned_from_row_id)) {
      skipForDate.push(dup.cloned_from_row_id);
    }
  }

  const totalCount = Object.values(conflicts).reduce((sum, arr) => sum + arr.length, 0);

  return { conflicts, totalCount, skipMap };
}
