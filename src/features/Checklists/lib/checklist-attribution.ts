/**
 * Atribución de una respuesta de checklist: a qué empleado se le imputa.
 *
 * Módulo puro (sin acceso a datos): decide el orden de precedencia de las tres fuentes
 * posibles del `employee_id`. De ese valor dependen `checklist_answers.employee_id` y
 * `checklist_deviations.created_by_employee_id`, así que se prueba aparte.
 */

export type ChecklistEmployeeIdSources = {
  /** `employee_id` del payload del formulario (lo pasa el flujo QR por `defaultEmployeeId`). */
  payload?: string | null;
  /** Cookie `empleado_id`, que deja el ingreso por QR. */
  cookie?: string | null;
  /** `employee_id` de `app_metadata` / `user_metadata` del usuario de sesión. */
  metadata?: string | null;
};

const firstNonEmpty = (...values: Array<string | null | undefined>): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return null;
};

/**
 * Empleado al que se imputa la respuesta: payload → cookie → metadata de sesión.
 *
 * La metadata es el último recurso pero no es opcional: desde
 * `dashboard/forms/[id]/new` no hay `defaultEmployeeId` ni cookie `empleado_id`, y sin
 * ella un usuario-empleado grababa el checklist sin atribución.
 */
export function resolveChecklistEmployeeId({ payload, cookie, metadata }: ChecklistEmployeeIdSources): string | null {
  return firstNonEmpty(payload, cookie, metadata);
}
