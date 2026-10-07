import type { certification_status } from '@/generated/prisma/enums';

/**
 * Estados de una certificación.
 *
 * ```
 * borrador ──emitir──> emitida ──confirmar──> confirmada ══factura autorizada══> facturada
 *     │                   │                      │      ◄══nota de crédito total══
 *  eliminar            anular                  anular
 *     ▼                   ▼                      ▼
 *  (se borra)          anulada                anulada
 * ```
 *
 * La regla dura: **una certificación emitida no se muta.** Al emitir se copia el precio
 * unitario a cada línea y el documento deja de mirar el catálogo; si hay que corregirla se
 * anula y se emite otra. Es lo mismo que el proyecto ya aplica a cualquier registro en estado
 * cerrado, y acá pesa más porque el número ya salió y alguien lo tiene.
 *
 * El borrador, en cambio, se recalcula contra el precio vigente cada vez que se refresca.
 *
 * Las transiciones `══` no son acciones del usuario sobre la certificación: las hace el módulo de
 * facturación al autorizar en ARCA la factura o la nota de crédito total. Por eso no figuran en
 * `TRANSITIONS`, y una facturada no se anula: primero hay que emitir la nota de crédito.
 */

export const CERTIFICATION_STATUS_LABELS: Record<certification_status, string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  confirmada: 'Confirmada',
  anulada: 'Anulada',
  facturada: 'Facturada',
};

const TRANSITIONS: Record<certification_status, certification_status[]> = {
  borrador: ['emitida'],
  emitida: ['confirmada', 'anulada'],
  confirmada: ['anulada'],
  anulada: [],
  facturada: [],
};

export function canTransition(from: certification_status, to: certification_status): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Sólo el borrador admite cambios: agregar líneas, refrescar precios, cambiar el período. */
export function isEditable(status: certification_status): boolean {
  return status === 'borrador';
}

/** Sólo un borrador se elimina; lo ya emitido se anula, que deja rastro. */
export function isDeletable(status: certification_status): boolean {
  return status === 'borrador';
}

/** Mensaje para el usuario cuando la transición no corresponde. */
export function transitionError(from: certification_status, to: certification_status): string {
  if (from === to) return `La certificación ya está ${CERTIFICATION_STATUS_LABELS[to].toLowerCase()}`;
  if (from === 'anulada') return 'La certificación está anulada y no admite cambios';
  if (from === 'facturada') {
    return 'La certificación está facturada: para anularla primero hay que emitir una nota de crédito total';
  }
  if (from === 'confirmada' && to === 'emitida') {
    return 'Una certificación confirmada no vuelve a emitida: hay que anularla y emitir otra';
  }
  return `No se puede pasar de ${CERTIFICATION_STATUS_LABELS[from].toLowerCase()} a ${CERTIFICATION_STATUS_LABELS[to].toLowerCase()}`;
}
