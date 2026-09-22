/**
 * Lógica pura de la validación de solicitudes de mantenimiento (Operaciones — Paso 1).
 *
 * Decide el estado final de la solicitud, si la aprobación genera un pedido
 * (`maintenance_orders`) y qué ítems llegan al taller. Sin acceso a datos: la action
 * lee los ítems, calcula cuáles propagan y le pasa los ids a este módulo.
 */
import { MIN_APPROVAL_DESCRIPTION_LENGTH } from '../constants/approval';

/** Estados de `maintenance_requests`. */
export const MAINTENANCE_REQUEST_STATUSES = ['pending_approval', 'approved', 'rejected'] as const;
export type MaintenanceRequestStatus = (typeof MAINTENANCE_REQUEST_STATUSES)[number];

/** Una solicitud sólo se resuelve desde `pending_approval`; aprobada o rechazada es terminal. */
const REQUEST_TRANSITIONS: Record<MaintenanceRequestStatus, readonly MaintenanceRequestStatus[]> = {
  pending_approval: ['approved', 'rejected'],
  approved: [],
  rejected: [],
};

function isKnownStatus(value: string): value is MaintenanceRequestStatus {
  return (MAINTENANCE_REQUEST_STATUSES as readonly string[]).includes(value);
}

/** `true` si la solicitud puede pasar de `from` a `to`. */
export function isValidRequestTransition(from: string, to: string): boolean {
  if (!isKnownStatus(from) || !isKnownStatus(to)) return false;
  return REQUEST_TRANSITIONS[from].includes(to);
}

/** Descripción que verá el taller, recortada; `null` si queda vacía. */
export function normalizeApprovalDescription(description: string | null | undefined): string | null {
  const trimmed = description?.trim();
  return trimmed ? trimmed : null;
}

/** La descripción del validador es obligatoria y tiene largo mínimo cuando se genera pedido. */
export function isValidApprovalDescription(description: string | null | undefined): boolean {
  const normalized = normalizeApprovalDescription(description);
  return normalized !== null && normalized.length >= MIN_APPROVAL_DESCRIPTION_LENGTH;
}

export interface ApprovalRejectedItem {
  itemId: string;
  reason: string;
}

export interface ApprovalOutcomeInput {
  /** Ítems que el validador aprobó. */
  approvedItemIds: readonly string[];
  /** Subconjunto de los aprobados que sí propaga al taller (matriz checklist × ítem). */
  propagatingItemIds: readonly string[];
  rejectedItems: readonly ApprovalRejectedItem[];
  /** Aprobación preventiva: siempre genera pedido, sin ítems de checklist. */
  preventiveApproval?: boolean;
}

export interface ApprovalOutcome {
  /** Se crea `maintenance_orders` con sus ítems. */
  willCreateOrder: boolean;
  /** Estado final de la solicitud. */
  requestStatus: Extract<MaintenanceRequestStatus, 'approved' | 'rejected'>;
  /** Motivos de rechazo unificados, o `null` si la solicitud no se cierra rechazada. */
  rejectionReason: string | null;
  /** Ítems aprobados que generan `maintenance_order_items`. */
  orderItemIds: string[];
  /** Ítems aprobados que quedan en la solicitud pero no llegan al taller. */
  skippedItemIds: string[];
  /** La descripción del validador es obligatoria en este caso. */
  requiresDescription: boolean;
}

/**
 * Resuelve el desenlace de la validación.
 *
 * - Si al menos un ítem aprobado propaga → se crea el pedido y la solicitud queda `approved`.
 * - Si no propaga ninguno y hubo rechazos → la solicitud se cierra `rejected` (si no, quedaría
 *   `approved` sin pedido: invisible en la bandeja y sin figurar como rechazada).
 * - Una aprobación preventiva siempre genera pedido.
 */
export function resolveApprovalOutcome(input: ApprovalOutcomeInput): ApprovalOutcome {
  if (input.preventiveApproval) {
    return {
      willCreateOrder: true,
      requestStatus: 'approved',
      rejectionReason: null,
      orderItemIds: [],
      skippedItemIds: [],
      requiresDescription: true,
    };
  }

  const propagating = new Set(input.propagatingItemIds);
  const orderItemIds = input.approvedItemIds.filter((id) => propagating.has(id));
  const skippedItemIds = input.approvedItemIds.filter((id) => !propagating.has(id));

  const willCreateOrder = orderItemIds.length > 0;
  const isFullyRejected = !willCreateOrder && input.rejectedItems.length > 0;

  const rejectionReason = isFullyRejected
    ? [...new Set(input.rejectedItems.map((item) => item.reason.trim()).filter(Boolean))].join('; ')
    : null;

  return {
    willCreateOrder,
    requestStatus: isFullyRejected ? 'rejected' : 'approved',
    rejectionReason,
    orderItemIds,
    skippedItemIds,
    requiresDescription: willCreateOrder,
  };
}
