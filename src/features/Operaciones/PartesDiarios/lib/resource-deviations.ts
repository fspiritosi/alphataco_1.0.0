/**
 * Clasificación de desvíos de recursos asignados a una línea de parte diario.
 *
 * Módulo puro (sin BD, sin `server-only`): la misma regla la aplica la UI del detalle
 * y la función SQL `get_daily_report_deviations`. Tenerla acá permite testearla y evita
 * que la regla se escriba distinto en cada pantalla.
 */

/** Desvío de un empleado asignado a una línea. `ok` = sin desvío. */
export type EmployeeDeviationKind = 'ok' | 'no_contractor' | 'deviation_no_diagram' | 'deviation_non_work_day';

/** Desvío de un equipo asignado a una línea. `ok` = sin desvío. */
export type EquipmentDeviationKind = 'ok' | 'no_contractor' | 'deviation_non_operative';

export interface EmployeeDeviationInput {
  /** El empleado está afectado (`contractor_employee`) al cliente de la línea. */
  hasContractor: boolean;
  /** Existe un `employees_diagram` activo para el día del parte. */
  diagramForDay: boolean;
  /** El `diagram_type` del día tiene `work_active = true`. Irrelevante si no hay diagrama. */
  isWorkDay: boolean;
}

export interface EquipmentDeviationInput {
  /** El equipo está afectado (`contractor_equipment`) al cliente de la línea. */
  hasContractor: boolean;
  /** `vehicles.condition` / `other_equipment.condition`. `null` = sin dato: no se considera desvío. */
  condition: string | null;
}

/** Condición que NO genera desvío de equipo. */
const OPERATIVE_CONDITION = 'operativo';

/**
 * Orden de prioridad: falta de afectación al cliente → falta de diagrama → día no laboral.
 * La falta de afectación manda porque es el desvío que se reporta al cliente.
 */
export function classifyEmployeeDeviation({
  hasContractor,
  diagramForDay,
  isWorkDay,
}: EmployeeDeviationInput): EmployeeDeviationKind {
  if (!hasContractor) return 'no_contractor';
  if (!diagramForDay) return 'deviation_no_diagram';
  if (!isWorkDay) return 'deviation_non_work_day';
  return 'ok';
}

/**
 * Orden de prioridad: falta de afectación al cliente → condición distinta de `operativo`.
 * Una condición `null` (sin dato cargado) NO es desvío.
 */
export function classifyEquipmentDeviation({ hasContractor, condition }: EquipmentDeviationInput): EquipmentDeviationKind {
  if (!hasContractor) return 'no_contractor';
  if (condition !== null && condition !== OPERATIVE_CONDITION) return 'deviation_non_operative';
  return 'ok';
}
