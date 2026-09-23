/**
 * Bloqueo de OTs por secuencia de sectores.
 *
 * Un pedido se reparte entre varios sectores del taller y cada ítem lleva un
 * `sector_sequence_order`: el sector 2 no puede empezar hasta que el 1 terminó. Esta regla
 * decidía qué tarjetas se ven con candado en el panel del operario y vivía enredada con
 * las consultas; acá queda como función pura para poder testearla.
 *
 * Módulo puro: NO consulta la base. Quien llama trae las filas con `loadSectorSequenceItems`.
 */

/** Ítem del pedido, reducido a lo que decide el bloqueo. */
export interface SectorSequenceItem {
  maintenanceOrderId: string;
  workOrderId: string;
  /** Posición del sector en el circuito del pedido. */
  sequenceOrder: number;
  assignedSectorId: string | null;
  /** Nombre del sector asignado, para poder decir a quién se está esperando. */
  sectorName: string | null;
  workOrderStatus: string | null;
}

export interface WorkOrderBlockingStatus {
  isBlocked: boolean;
  /** Nombre del sector que bloquea, o null si no está bloqueada. */
  blockedBySector: string | null;
}

/**
 * Estados de OT que NO bloquean a los sectores siguientes.
 *
 * `paused` entra acá a propósito: pausar es lo que habilita el "uno a la vez", es decir
 * soltar el equipo para que otro sector trabaje. Si una OT pausada bloqueara, el circuito
 * se trabaría en el primer sector que se detiene.
 */
const NON_BLOCKING_STATUSES = new Set(['completed', 'completed_partial', 'paused']);

function isBlockingStatus(status: string | null): boolean {
  return !NON_BLOCKING_STATUSES.has(status ?? '');
}

/**
 * Calcula, para cada OT pedida, si está bloqueada por un sector anterior.
 *
 * Una OT se evalúa en su secuencia MÍNIMA: si tiene ítems en la 1 y en la 3, puede trabajar
 * los de la 1 aunque los de la 3 estén bloqueados. Bloquea cualquier ítem de OTRO sector en
 * una secuencia menor cuya OT siga abierta.
 *
 * Las secuencias se recorren de menor a mayor, así el sector que se informa como bloqueante
 * es siempre el más atrasado del circuito (antes dependía del orden en que volvían las filas).
 */
export function computeWorkOrderBlocking(
  workOrderIds: readonly string[],
  items: readonly SectorSequenceItem[]
): Record<string, WorkOrderBlockingStatus> {
  const result: Record<string, WorkOrderBlockingStatus> = {};
  for (const id of workOrderIds) {
    result[id] = { isBlocked: false, blockedBySector: null };
  }

  if (workOrderIds.length === 0) return result;

  const targets = new Set(workOrderIds);

  // Ítems agrupados por pedido: el bloqueo se resuelve dentro de cada pedido.
  const itemsByOrder = new Map<string, SectorSequenceItem[]>();
  for (const item of items) {
    const group = itemsByOrder.get(item.maintenanceOrderId);
    if (group) group.push(item);
    else itemsByOrder.set(item.maintenanceOrderId, [item]);
  }

  for (const orderItems of itemsByOrder.values()) {
    // Secuencia mínima de cada OT pedida dentro de este pedido, con su sector.
    const minSequenceByWorkOrder = new Map<string, { sequence: number; sectorId: string | null }>();
    for (const item of orderItems) {
      if (!targets.has(item.workOrderId)) continue;
      const current = minSequenceByWorkOrder.get(item.workOrderId);
      if (!current || item.sequenceOrder < current.sequence) {
        minSequenceByWorkOrder.set(item.workOrderId, {
          sequence: item.sequenceOrder,
          sectorId: item.assignedSectorId,
        });
      }
    }

    if (minSequenceByWorkOrder.size === 0) continue;

    const sortedItems = [...orderItems].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    for (const [workOrderId, { sequence, sectorId }] of minSequenceByWorkOrder) {
      const blocker = sortedItems.find(
        (item) =>
          item.sequenceOrder < sequence && item.assignedSectorId !== sectorId && isBlockingStatus(item.workOrderStatus)
      );

      if (blocker) {
        result[workOrderId] = { isBlocked: true, blockedBySector: blocker.sectorName };
      }
    }
  }

  return result;
}
