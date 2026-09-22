/**
 * Máquina de estados del pedido (preparte).
 *
 * Módulo puro (sin BD): centraliza qué transiciones son válidas y qué estados admiten
 * las acciones masivas, para que el modal masivo, la confirmación individual y las
 * server actions apliquen exactamente la misma regla.
 */

import { preparte_status } from '@/generated/prisma/enums';

export type PreparteStatus = preparte_status;

/** Todos los estados posibles, en el orden en que los muestra la UI. */
export const PREPARTE_STATUSES: readonly PreparteStatus[] = [
  preparte_status.pendiente,
  preparte_status.confirmado,
  preparte_status.rechazado,
  preparte_status.cancelado,
  preparte_status.reprogramado,
  preparte_status.vencido,
];

/** Estados cerrados: no admiten ninguna transición de salida. */
const FINAL_STATUSES: readonly PreparteStatus[] = [
  preparte_status.confirmado,
  preparte_status.cancelado,
  preparte_status.rechazado,
];

/**
 * Estados sobre los que se puede operar en masa (confirmar, cambiar estado, reprogramar).
 * `vencido` queda afuera: se confirma de a uno, asignándole fecha nueva.
 */
export const BULK_EDITABLE_STATUSES: readonly PreparteStatus[] = [
  preparte_status.pendiente,
  preparte_status.reprogramado,
];

/** Transiciones permitidas por estado de origen. Un estado ausente = sin salidas. */
const ALLOWED_TRANSITIONS: Readonly<Record<PreparteStatus, readonly PreparteStatus[]>> = {
  [preparte_status.pendiente]: [
    preparte_status.confirmado,
    preparte_status.rechazado,
    preparte_status.cancelado,
    preparte_status.reprogramado,
    preparte_status.vencido,
  ],
  [preparte_status.reprogramado]: [
    preparte_status.confirmado,
    preparte_status.rechazado,
    preparte_status.cancelado,
    preparte_status.vencido,
  ],
  // Un vencido todavía se puede confirmar asignándole una fecha de ejecución nueva.
  [preparte_status.vencido]: [preparte_status.confirmado],
  [preparte_status.confirmado]: [],
  [preparte_status.cancelado]: [],
  [preparte_status.rechazado]: [],
};

/** `true` si el pedido ya está cerrado y no admite cambios de estado. */
export function isFinalStatus(status: PreparteStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

/** `true` si `from → to` es una transición válida. Quedarse en el mismo estado no lo es. */
export function canTransition(from: PreparteStatus, to: PreparteStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** `true` si el pedido puede confirmarse dentro de una acción masiva. */
export function canBulkConfirm(status: PreparteStatus | null | undefined): boolean {
  return status != null && BULK_EDITABLE_STATUSES.includes(status);
}

/** `true` si el pedido puede editarse (cambio de estado / reprogramación) en masa. */
export function canBulkEdit(status: PreparteStatus | null | undefined): boolean {
  return status != null && BULK_EDITABLE_STATUSES.includes(status);
}
