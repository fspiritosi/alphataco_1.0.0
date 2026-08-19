// ============================================================================
// Helpers para el modo in-memory del DataTable (`inMemory` prop)
// ============================================================================
// En modo in-memory el filtrado y el ordenamiento los resuelve TanStack sobre
// el dataset completo, así que las columnas necesitan `filterFn` / `sortingFn`
// propios. Los valores de filtro siempre llegan como `string[]` porque así los
// serializa la URL (ver `useDataTable`).
// ============================================================================

import type { Row } from '@tanstack/react-table';
import moment from 'moment';

/** Normaliza el valor del filtro a un array de strings no vacíos. */
function toFilterValues(filterValue: unknown): string[] {
  if (Array.isArray(filterValue)) return filterValue.map(String).filter(Boolean);
  if (filterValue == null || filterValue === '') return [];
  return [String(filterValue)];
}

/**
 * `filterFn` para columnas de texto: coincidencia parcial, sin distinguir
 * mayúsculas ni acentos de mayúsculas. Coincide si el valor de la fila contiene
 * alguno de los términos buscados.
 */
export function inMemoryTextFilterFn<TData>(row: Row<TData>, columnId: string, filterValue: unknown): boolean {
  const values = toFilterValues(filterValue);
  if (values.length === 0) return true;

  const cellValue = String(row.getValue(columnId) ?? '').toLowerCase();
  return values.some((value) => cellValue.includes(value.toLowerCase()));
}

/**
 * `filterFn` para columnas facetadas (select múltiple): coincide si el valor de
 * la fila es exactamente alguno de los seleccionados.
 */
export function inMemoryFacetedFilterFn<TData>(row: Row<TData>, columnId: string, filterValue: unknown): boolean {
  const values = toFilterValues(filterValue);
  if (values.length === 0) return true;

  return values.includes(String(row.getValue(columnId) ?? ''));
}

/**
 * Formatos de fecha que devuelven los RPCs: con ceros a la izquierda
 * (`14/08/2026`, el detalle de ausencias) y sin ellos (`1/8/2026`, la serie diaria).
 */
const DATE_FORMATS = ['DD/MM/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'];

/**
 * `sortingFn` para columnas con fechas en formato día/mes/año. Sin esto se
 * ordenarían como texto (el 01/01/2027 quedaría antes que el 02/01/2026).
 * Las filas sin fecha válida van al final.
 */
export function inMemoryDateSortingFn<TData>(rowA: Row<TData>, rowB: Row<TData>, columnId: string): number {
  const toTimestamp = (row: Row<TData>) => {
    const raw = row.getValue(columnId);
    if (!raw) return null;
    const parsed = moment(String(raw), DATE_FORMATS, true);
    return parsed.isValid() ? parsed.valueOf() : null;
  };

  const a = toTimestamp(rowA);
  const b = toTimestamp(rowB);

  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}
