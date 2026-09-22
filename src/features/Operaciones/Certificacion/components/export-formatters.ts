/**
 * Formateo de datos para la exportación a Excel del tablero comercial.
 *
 * Los valores llegan del `exportFormatter` de la tabla, que no conoce el tipo de cada
 * columna: por eso la entrada es `unknown` y cada función se encarga de estrechar.
 */

import { Logger } from '@/lib/logger';

const logger = new Logger('Certificacion/export-formatters');

/** Une una lista de textos con coma; vacío → `-`. */
function joinOrDash(values: unknown[]): string {
  const texts = values.map((value) => (value == null ? '' : String(value))).filter(Boolean);
  return texts.length > 0 ? texts.join(', ') : '-';
}

/** Parsea un JSON sin lanzar. Devuelve `undefined` si no es JSON válido. */
function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/** Lista de empleados (array de textos o string JSON). */
export function formatEmployeesForExport(value: unknown): string {
  if (typeof value === 'string') {
    const parsed = tryParseJson(value);
    if (Array.isArray(parsed)) return joinOrDash(parsed);
    return value || '-';
  }
  if (Array.isArray(value)) return joinOrDash(value);
  return value == null ? '-' : String(value) || '-';
}

/** Lista de equipos (array de textos o string JSON). */
export function formatEquipmentForExport(value: unknown): string {
  return formatEmployeesForExport(value);
}

/** Nombre de un equipo del cliente, que puede venir como objeto `{ name }` o como texto. */
function equipmentName(item: unknown): string {
  if (item && typeof item === 'object' && 'name' in item) {
    const name = (item as { name?: unknown }).name;
    return name == null ? '' : String(name);
  }
  return item == null ? '' : String(item);
}

/** Equipos del cliente: extrae el nombre de cada objeto. */
export function formatCustomerEquipmentForExport(value: unknown): string {
  if (typeof value === 'string') {
    const parsed = tryParseJson(value);
    if (Array.isArray(parsed)) return joinOrDash(parsed.map(equipmentName));
    return value || '-';
  }
  if (Array.isArray(value)) return joinOrDash(value.map(equipmentName));
  return value == null ? '-' : String(value) || '-';
}

/** Fecha en `DD/MM/YYYY`. Si el valor no es una fecha válida se devuelve tal cual. */
export function formatDateForExport(value: unknown): string {
  if (value == null || value === '') return '-';

  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    logger.warn('Valor de fecha no exportable', { data: { value: String(value) } });
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Estado de la línea traducido. */
export function formatStatusForExport(value: unknown): string {
  const statusMap: Record<string, string> = {
    pendiente: 'Pendiente',
    sin_recursos_asignados: 'Sin recursos asignados',
    ejecutado: 'Ejecutado',
    reprogramado: 'Reprogramado',
    cancelado: 'Cancelado',
    en_certificacion: 'En certificación',
  };

  const key = value == null ? '' : String(value);
  return statusMap[key] || key || '-';
}

/** Cualquier otro valor: array → coma, objeto con `name` → `name`, resto → texto. */
export function formatGenericValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return joinOrDash(value);

  if (typeof value === 'object') {
    if ('name' in value) {
      const name = (value as { name?: unknown }).name;
      if (name != null) return String(name);
    }
    return JSON.stringify(value);
  }

  return String(value);
}
