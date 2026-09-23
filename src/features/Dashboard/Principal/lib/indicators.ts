import type {
  DiagramIndicatorResult,
  EquipmentIndicatorResult,
  ServiceDetailByClient,
  ServicesSummaryResult,
} from '../actions/types';

/**
 * Agregaciones del dashboard principal.
 *
 * Son los cálculos que antes vivían embebidos en las server actions: acá son funciones
 * puras sobre las filas que devuelve Prisma, así que se pueden testear sin base.
 */

/** Condiciones que dejan a un equipo fuera de servicio. */
export const NOT_OPERATIVE_CONDITIONS = ['no_operativo', 'en_reparacion', 'en_preparacion'] as const;

export type NotOperativeCondition = (typeof NOT_OPERATIVE_CONDITIONS)[number];

/** `true` si la condición del equipo lo deja fuera de servicio. */
export function isNotOperative(condition: string | null | undefined): boolean {
  return condition != null && (NOT_OPERATIVE_CONDITIONS as readonly string[]).includes(condition);
}

/** Porcentaje entero, con 0 cuando el denominador es 0. */
export function percentage(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

export interface VehicleForIndicator {
  id: string;
  condition: string | null;
  type_vehicles_typeTotype: { name: string | null } | null;
}

/**
 * Indicador de uso de equipos por tipo.
 *
 * Un equipo fuera de servicio cuenta como "no disponible" y NUNCA como usado, aunque
 * aparezca en el parte. Sale ordenado por flota total (disponibles + no disponibles).
 */
export function aggregateEquipmentIndicators(
  vehicles: readonly VehicleForIndicator[],
  usedVehicleIds: ReadonlySet<string>
): EquipmentIndicatorResult[] {
  const typeMap = new Map<string, { available: number; notAvailable: number; used: number }>();

  for (const vehicle of vehicles) {
    const typeName = vehicle.type_vehicles_typeTotype?.name ?? 'Sin tipo';

    let entry = typeMap.get(typeName);
    if (!entry) {
      entry = { available: 0, notAvailable: 0, used: 0 };
      typeMap.set(typeName, entry);
    }

    if (isNotOperative(vehicle.condition)) {
      entry.notAvailable++;
      continue;
    }

    entry.available++;
    if (usedVehicleIds.has(vehicle.id)) entry.used++;
  }

  return [...typeMap.entries()]
    .map(([name, counts]) => ({
      type_name: name,
      // El modelo `type` no tiene color; lo resuelve la UI.
      type_color: null,
      available_units: counts.available,
      used_units: counts.used,
      not_available_units: counts.notAvailable,
    }))
    .sort((a, b) => b.available_units + b.not_available_units - (a.available_units + a.not_available_units));
}

/** Totales de flota que alimentan las tarjetas de KPIs. */
export function summarizeFleet(indicators: readonly EquipmentIndicatorResult[]): {
  operative: number;
  notAvailable: number;
  total: number;
} {
  let operative = 0;
  let notAvailable = 0;

  for (const indicator of indicators) {
    operative += indicator.available_units;
    notAvailable += indicator.not_available_units;
  }

  return { operative, notAvailable, total: operative + notAvailable };
}

export interface DiagramRowForIndicator {
  employee_id: string | null;
  diagram_type: string | null;
  diagram_type_employees_diagram_diagram_typeTodiagram_type: { name: string | null; color: string | null } | null;
}

/** Id y etiqueta de la categoría sintética "Sin diagrama". */
export const NO_DIAGRAM_ID = '__none__';
const NO_DIAGRAM_COLOR = '#999999';

/**
 * Cantidad de empleados por tipo de diagrama del día, contando cada empleado una sola vez
 * aunque tenga varias filas. Agrega "Sin diagrama" con los activos que no aparecen en
 * ninguna fila. Sale ordenado por cantidad descendente.
 */
export function aggregateDiagramIndicators(
  rows: readonly DiagramRowForIndicator[],
  totalActiveEmployees: number
): DiagramIndicatorResult[] {
  const typeMap = new Map<string, { name: string; color: string; employees: Set<string> }>();
  const employeesWithDiagram = new Set<string>();

  for (const row of rows) {
    const diagramType = row.diagram_type_employees_diagram_diagram_typeTodiagram_type;
    if (!diagramType || !row.employee_id) continue;

    const key = row.diagram_type ?? 'unknown';
    employeesWithDiagram.add(row.employee_id);

    let entry = typeMap.get(key);
    if (!entry) {
      entry = { name: diagramType.name ?? 'Sin nombre', color: diagramType.color ?? NO_DIAGRAM_COLOR, employees: new Set() };
      typeMap.set(key, entry);
    }
    entry.employees.add(row.employee_id);
  }

  const result: DiagramIndicatorResult[] = [...typeMap.entries()].map(([key, entry]) => ({
    diagram_type_id: key,
    diagram_type_name: entry.name,
    diagram_type_color: entry.color,
    cantidad_empleados: entry.employees.size,
  }));

  const withoutDiagram = totalActiveEmployees - employeesWithDiagram.size;
  if (withoutDiagram > 0) {
    result.push({
      diagram_type_id: NO_DIAGRAM_ID,
      diagram_type_name: 'Sin diagrama',
      diagram_type_color: NO_DIAGRAM_COLOR,
      cantidad_empleados: withoutDiagram,
    });
  }

  return result.sort((a, b) => b.cantidad_empleados - a.cantidad_empleados);
}

export interface ServiceTypeGroup {
  type_service: string | null;
  _count: { id: number };
}

/** Resumen de servicios por tipo, con el porcentaje sobre el total del día. */
export function summarizeServicesByType(groups: readonly ServiceTypeGroup[]): ServicesSummaryResult[] {
  const totalCount = groups.reduce((sum, group) => sum + group._count.id, 0);

  return groups
    .filter((group): group is ServiceTypeGroup & { type_service: string } => group.type_service != null)
    .map((group) => ({
      type_service: group.type_service,
      service_count: group._count.id,
      percentage: percentage(group._count.id, totalCount),
    }));
}

export interface ServiceRowForClient {
  type_service: string | null;
  status: string | null;
  customers: { id: string; name: string } | null;
}

const ADICIONAL_SERVICE_TYPES = new Set(['adicional', 'adicional_permanente']);

/**
 * Detalle de servicios agrupado por cliente: mensuales, adicionales y distribución por
 * estado. Sale ordenado por total descendente. Las filas sin cliente se descartan.
 */
export function groupServicesByClient(rows: readonly ServiceRowForClient[]): ServiceDetailByClient[] {
  const clientsMap = new Map<
    string,
    { client_name: string; mensual_count: number; adicional_count: number; status_counts: Map<string, number> }
  >();

  for (const row of rows) {
    if (!row.customers) continue;

    let client = clientsMap.get(row.customers.id);
    if (!client) {
      client = { client_name: row.customers.name, mensual_count: 0, adicional_count: 0, status_counts: new Map() };
      clientsMap.set(row.customers.id, client);
    }

    if (row.type_service === 'mensual') client.mensual_count++;
    else if (row.type_service != null && ADICIONAL_SERVICE_TYPES.has(row.type_service)) client.adicional_count++;

    const status = row.status ?? 'sin_estado';
    client.status_counts.set(status, (client.status_counts.get(status) ?? 0) + 1);
  }

  return [...clientsMap.values()]
    .map((client) => ({
      client_name: client.client_name,
      mensual_count: client.mensual_count,
      adicional_count: client.adicional_count,
      total_count: client.mensual_count + client.adicional_count,
      status_distribution: [...client.status_counts.entries()].map(([status, count]) => ({ status, count })),
    }))
    .sort((a, b) => b.total_count - a.total_count);
}
