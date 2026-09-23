/**
 * Acciones que el operario puede hacer sobre una OT, según el estado en que esté.
 *
 * `Mantenimiento/lib/order-status.ts` deja esta máquina afuera a propósito: los cambios de
 * estado de una `work_orders` los hace este panel. Acá viven, en un módulo puro con tests,
 * porque antes estaban repartidos entre las actions (pausar y reanudar validaban; iniciar
 * no validaba nada y cerrar sólo miraba `pending`).
 *
 * Módulo puro: NO consulta la base.
 */

export type OperatorWorkOrderAction = 'start' | 'pause' | 'resume' | 'close';

/** Estados desde los que cada acción es válida. */
const ALLOWED_FROM: Record<OperatorWorkOrderAction, readonly string[]> = {
  start: ['pending'],
  pause: ['in_progress'],
  resume: ['paused'],
  close: ['in_progress', 'paused'],
};

/** Estados en los que la OT ya terminó: no admiten ninguna acción del operario. */
const CLOSED_STATUSES = ['completed', 'completed_partial'] as const;

const CLOSED_LABELS: Record<string, string> = {
  completed: 'completada',
  completed_partial: 'completada parcial',
};

/** Mensaje de cada acción cuando la OT está abierta pero en el estado equivocado. */
const WRONG_STATE_MESSAGES: Record<OperatorWorkOrderAction, string> = {
  start: 'Solo se puede iniciar una OT pendiente',
  pause: 'Solo se puede pausar una OT que esté en progreso',
  resume: 'Solo se puede reanudar una OT que esté pausada',
  close: 'No se puede cerrar la OT: primero debe iniciarla',
};

export function canOperatorAct(status: string, action: OperatorWorkOrderAction): boolean {
  return ALLOWED_FROM[action].includes(status);
}

/** Igual que `canOperatorAct`, pero lanza con el mensaje que ve el operario. */
export function assertOperatorAction(status: string, action: OperatorWorkOrderAction): void {
  if (canOperatorAct(status, action)) return;

  if ((CLOSED_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`La orden de trabajo ya está ${CLOSED_LABELS[status]}`);
  }

  if (status === 'cancelled') {
    throw new Error('La orden de trabajo está cancelada');
  }

  throw new Error(WRONG_STATE_MESSAGES[action]);
}

/**
 * Estado con el que cierra una OT: `completed` sólo si todas sus tareas quedaron completas.
 *
 * Una OT sin tareas cierra como `completed`: no quedó nada pendiente. Es lo que hacía el
 * `every` sobre la lista vacía y hay flujos que dependen de eso.
 */
export function resolveWorkOrderCloseStatus(repairStatuses: readonly string[]): 'completed' | 'completed_partial' {
  return repairStatuses.every((status) => status === 'completed') ? 'completed' : 'completed_partial';
}
