/**
 * Condiciones de los tipos de documento especiales (`document_types.conditions`, `Json[]`).
 *
 * Módulo PURO (sin Prisma ni 'use server'): parsea el JSON que guardan los triggers SQL y lo
 * evalúa en TS. La regla de negocio es la misma que `build_employee_where_alias` en Postgres:
 * un recurso cumple el tipo sólo si cumple TODAS las condiciones del array (AND), tanto las
 * simples (columna directa de `employees`/`vehicles`) como las M:M (fila en la tabla pivote).
 *
 * Evaluar sólo `conditions[0]` a mano dio un falso negativo en el ticket 712: un tipo tenía dos
 * condiciones y la segunda era una relación M:M. De ahí `resourceMatchesConditions`.
 */

/** Condición sobre una columna directa del recurso (`company_position`, `guild_id`, `brand`...). */
export interface DirectDocumentCondition {
  kind: 'direct';
  propertyKey: string;
  /** Columna en `employees` / `vehicles`. */
  filterColumn: string;
  ids: string[];
}

/** Condición M:M: el recurso debe tener al menos una fila en la pivote con `filterColumn` en `ids`. */
export interface ManyToManyDocumentCondition {
  kind: 'many_to_many';
  propertyKey: string;
  /** Tabla pivote (`empleado_aptitudes`, `contractor_employee`, `contractor_equipment`...). */
  relationTable: string;
  /** Columna de la pivote que referencia el catálogo (`aptitud_id`, `contractor_id`...). */
  filterColumn: string;
  ids: string[];
}

export type DocumentCondition = DirectDocumentCondition | ManyToManyDocumentCondition;

export type ConditionApplies = 'Persona' | 'Equipos';

/**
 * Recurso a evaluar: fila de `employees`/`vehicles` con las relaciones M:M cargadas como
 * arrays de filas de la pivote (`{ empleado_aptitudes: [{ aptitud_id }] }`).
 */
export type ConditionResource = Record<string, unknown>;

/** Columnas FK `bigint` en `employees` (el JSON guarda los ids como string). */
const BIGINT_COLUMNS_EMPLOYEES: ReadonlySet<string> = new Set(['province']);
/** Columnas FK `bigint` en `vehicles`. */
const BIGINT_COLUMNS_VEHICLES: ReadonlySet<string> = new Set(['brand', 'model', 'type_of_vehicle']);

/** Ids como texto, sin `null` ni `''` (misma limpieza que `id IS NOT NULL AND id <> ''` en SQL). */
function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string | number | bigint => ['string', 'number', 'bigint'].includes(typeof v))
    .map(String)
    .filter((v) => v !== '');
}

/**
 * Convierte el `Json[]` de `document_types.conditions` (o su string) a condiciones discriminadas.
 * Tolerante: entradas que no son objeto, sin `ids` o cuyos `ids` quedan vacíos tras descartar
 * `null`/`''` se ignoran (no restringen), igual que `build_employee_where_alias` en SQL.
 *
 * Divergencias conocidas respecto de la función SQL (NO soportadas acá, a propósito):
 * - `contractor_employee` con `values` (nombres) pero sin `ids`: la SQL resuelve por nombre;
 *   acá la condición se descarta. El editor actual siempre graba `ids`.
 * - "todas las condiciones inválidas": la SQL trata el tipo como sin condiciones (aplica a todos);
 *   acá también devuelve `[]`, pero no se distingue de un tipo especial mal configurado.
 */
export function parseDocumentConditions(raw: unknown): DocumentCondition[] {
  let entries: unknown;
  if (typeof raw === 'string') {
    try {
      entries = JSON.parse(raw);
    } catch {
      return [];
    }
  } else {
    entries = raw;
  }
  if (!Array.isArray(entries)) return [];

  const result: DocumentCondition[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const json = entry as Record<string, unknown>;
    const ids = toStringArray(json.ids);
    const filterColumn = typeof json.filter_column === 'string' ? json.filter_column : null;
    if (ids.length === 0 || !filterColumn) continue;
    const propertyKey = typeof json.property_key === 'string' ? json.property_key : filterColumn;
    const relationTable = typeof json.relation_table === 'string' ? json.relation_table : null;

    if (json.relation_type === 'many_to_many' && relationTable) {
      result.push({ kind: 'many_to_many', propertyKey, relationTable, filterColumn, ids });
    } else {
      result.push({ kind: 'direct', propertyKey, filterColumn, ids });
    }
  }
  return result;
}

function matchesOne(resource: ConditionResource, condition: DocumentCondition): boolean {
  if (condition.kind === 'direct') {
    const value = resource[condition.filterColumn];
    if (value === null || value === undefined) return false;
    return condition.ids.includes(String(value));
  }
  const rows = resource[condition.relationTable];
  if (!Array.isArray(rows)) return false;
  return rows.some((row) => {
    if (!row || typeof row !== 'object') return false;
    const value = (row as Record<string, unknown>)[condition.filterColumn];
    return value !== null && value !== undefined && condition.ids.includes(String(value));
  });
}

/**
 * `true` si el recurso cumple TODAS las condiciones (sin condiciones → aplica a todos).
 * Los valores se comparan como texto para cubrir uuid, enum y bigint por igual.
 *
 * Es el ORÁCULO testeado de la semántica de `build_employee_where_alias` /
 * `controlar_alertas_documentos_single_*` (AND de todas las condiciones, simples y M:M). Hoy no
 * tiene consumidor en runtime: la evaluación real corre en la base vía `buildConditionsWhereClause`
 * (misma semántica, mismos tests); sirve para razonar y verificar casos sin tocar la base.
 */
export function resourceMatchesConditions(resource: ConditionResource, conditions: readonly DocumentCondition[]): boolean {
  return conditions.every((condition) => matchesOne(resource, condition));
}

/**
 * Traduce las condiciones a un `where` de Prisma sobre `employees`/`vehicles` (misma semántica
 * que `resourceMatchesConditions`, evaluada en la base). NO incluye `company_id` ni `is_active`:
 * eso lo agrega el llamador. Devuelve `{}` sin condiciones, para componer con AND.
 */
export function buildConditionsWhereClause(
  applies: ConditionApplies,
  conditions: readonly DocumentCondition[]
): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  const bigintColumns = applies === 'Persona' ? BIGINT_COLUMNS_EMPLOYEES : BIGINT_COLUMNS_VEHICLES;

  for (const condition of conditions) {
    if (condition.ids.length === 0) continue;
    if (condition.kind === 'many_to_many') {
      where[condition.relationTable] = { some: { [condition.filterColumn]: { in: condition.ids } } };
      continue;
    }
    if (bigintColumns.has(condition.filterColumn)) {
      const numericIds = condition.ids.map(Number).filter((n) => !Number.isNaN(n));
      if (numericIds.length > 0) where[condition.filterColumn] = { in: numericIds };
      continue;
    }
    where[condition.filterColumn] = condition.ids.length === 1 ? condition.ids[0] : { in: condition.ids };
  }
  return where;
}
