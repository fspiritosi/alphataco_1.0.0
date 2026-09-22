/**
 * Clasificación de desvíos de recursos asignados a una línea de parte diario.
 *
 * Módulo puro (sin BD, sin `server-only`): la misma regla la aplica la UI del detalle
 * (`detail/columns/badge-cells.tsx`, que consume estas funciones) y la función SQL
 * `get_daily_report_deviations` (`prisma/sql/daily-report.sql`). Tenerla acá permite
 * testearla y evita que la regla se escriba distinto en cada pantalla.
 *
 * Semántica ADITIVA — igual que el SQL, que arma cada fila con
 * `WHERE is_duplicated OR is_unassigned_to_client OR has_no_diagram OR is_non_work_day`
 * (empleados) / `WHERE is_duplicated OR is_unassigned_to_client OR (condition <> 'operativo')`
 * (equipos): un recurso puede tener VARIOS desvíos simultáneos a la vez (ej. duplicado Y sin
 * diagrama cargado), no uno solo elegido por prioridad.
 */

export interface EmployeeDeviationFlags {
  is_duplicated: boolean;
  is_unassigned_to_client: boolean;
  has_no_diagram: boolean;
  is_non_work_day: boolean;
  /** Nombre del tipo de diagrama del día. Sólo se usa en el label de `non_work_day`. */
  diagram_type_name?: string | null;
}

export interface EquipmentDeviationFlags {
  is_duplicated: boolean;
  is_unassigned_to_client: boolean;
  /** `vehicles.condition` / `other_equipment.condition` (la función SQL la COALESCEa a `'desconocido'`). */
  condition: string | null;
}

export type EmployeeDeviationKind = 'duplicated' | 'unassigned_to_client' | 'no_diagram' | 'non_work_day';

export type EquipmentDeviationKind =
  | 'duplicated'
  | 'not_operative'
  | 'under_repair'
  | 'unassigned_to_client'
  | 'conditioned'
  | 'in_preparation';

export interface DeviationEntry<K extends string> {
  kind: K;
  /** Texto exacto que hoy muestra el tooltip de la celda (fuente única del label). */
  label: string;
}

/**
 * Todos los desvíos que aplican a un empleado (0, 1 o varios, simultáneos). El orden
 * coincide con el que arma hoy el tooltip de `EmployeeBadgeCell`.
 */
export function employeeDeviations(flags: EmployeeDeviationFlags): DeviationEntry<EmployeeDeviationKind>[] {
  const entries: DeviationEntry<EmployeeDeviationKind>[] = [];
  if (flags.is_duplicated) {
    entries.push({ kind: 'duplicated', label: 'Empleado asignado en múltiples filas' });
  }
  if (flags.is_unassigned_to_client) {
    entries.push({ kind: 'unassigned_to_client', label: 'No asignado al cliente de esta fila' });
  }
  if (flags.has_no_diagram) {
    entries.push({ kind: 'no_diagram', label: 'Sin diagrama cargado para este día' });
  }
  if (flags.is_non_work_day) {
    entries.push({ kind: 'non_work_day', label: `Día no laboral: ${flags.diagram_type_name ?? 'No laboral'}` });
  }
  return entries;
}

const NOT_OPERATIVE_CONDITIONS = new Set(['no operativo']);
const UNDER_REPAIR_CONDITIONS = new Set(['en reparacion', 'en_reparacion']);
const CONDITIONED_CONDITIONS = new Set(['operativo condicionado']);
const IN_PREPARATION_CONDITIONS = new Set(['en preparacion', 'en_preparacion']);

/**
 * Todos los desvíos que aplican a un equipo (0, 1 o varios, simultáneos). El orden coincide
 * con el que arma hoy el tooltip de `EquipmentBadgeCell`.
 */
export function equipmentDeviations(flags: EquipmentDeviationFlags): DeviationEntry<EquipmentDeviationKind>[] {
  const condition = flags.condition?.toLowerCase() ?? '';
  const entries: DeviationEntry<EquipmentDeviationKind>[] = [];

  if (flags.is_duplicated) {
    entries.push({ kind: 'duplicated', label: 'Asignado en múltiples filas del parte diario' });
  }
  if (NOT_OPERATIVE_CONDITIONS.has(condition)) {
    entries.push({ kind: 'not_operative', label: 'Condición: No operativo' });
  }
  if (UNDER_REPAIR_CONDITIONS.has(condition)) {
    entries.push({ kind: 'under_repair', label: 'Condición: En reparación' });
  }
  if (flags.is_unassigned_to_client) {
    entries.push({ kind: 'unassigned_to_client', label: 'No asignado al cliente de esta fila' });
  }
  if (CONDITIONED_CONDITIONS.has(condition)) {
    entries.push({ kind: 'conditioned', label: 'Condición: Condicionado' });
  }
  if (IN_PREPARATION_CONDITIONS.has(condition)) {
    entries.push({ kind: 'in_preparation', label: 'Condición: En preparación' });
  }
  return entries;
}
