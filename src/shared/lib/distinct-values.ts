/**
 * Lista cerrada de tablas que puede consultar `querySelectDistinct` (`select_distinct_values`)
 * y cómo se acota cada una a la empresa activa. La función SQL arma la query con el nombre
 * de tabla que le llega, así que nunca se acepta una tabla fuera de esta lista.
 *
 * - `companyColumn`: columna de la tabla base que se fuerza a `company_id` de la sesión
 *   (el cliente no puede sobreescribirla).
 * - `null`: la tabla no tiene `company_id` y se acotaría por relación. Hoy no queda ninguna:
 *   `documents_equipment` salió de la lista en P2 Task 4 (sus DataTables legacy se
 *   eliminaron; las vivas usan facets Prisma acotadas por `vehicles.company_id`).
 */
export const DISTINCT_VALUE_TABLES = {
  vehicles: { companyColumn: 'company_id' },
} as const satisfies Record<string, { companyColumn: string | null }>;

export type DistinctValueTable = keyof typeof DISTINCT_VALUE_TABLES;

export type DistinctFilters = Record<string, string | number | boolean | null>;

export function isDistinctValueTable(tableName: string): tableName is DistinctValueTable {
  return Object.prototype.hasOwnProperty.call(DISTINCT_VALUE_TABLES, tableName);
}

/**
 * Filtros finales para `p_filters`: los del cliente más `company_id = companyId` cuando la
 * tabla lo tiene. Cualquier `company_id` / `<tabla>.company_id` que traiga el cliente se
 * descarta. Lanza si la tabla no está admitida.
 */
export function buildDistinctFilters(
  tableName: string,
  clientFilters: DistinctFilters | null | undefined,
  companyId: string
): DistinctFilters | null {
  if (!isDistinctValueTable(tableName)) {
    throw new Error(`Tabla no admitida para select_distinct_values: ${tableName}`);
  }
  const { companyColumn } = DISTINCT_VALUE_TABLES[tableName];
  if (!companyColumn) return clientFilters ?? null;

  const merged: DistinctFilters = {};
  for (const [key, value] of Object.entries(clientFilters ?? {})) {
    if (key === companyColumn || key === `${tableName}.${companyColumn}`) continue;
    merged[key] = value;
  }
  merged[companyColumn] = companyId;
  return merged;
}
