/**
 * Sector actual de una orden de mantenimiento (ticket 675).
 *
 * El "sector actual" no es un campo de BD: se calcula a partir de los
 * `maintenance_order_items` de la orden, tomando el sector del item con el
 * `sector_sequence_order` más bajo (el primer paso pendiente/activo del
 * recorrido de la orden por el taller).
 *
 * Centralizado acá porque la misma lógica la necesitan tres lugares que deben
 * coincidir exactamente: la celda de la columna (columns.tsx), el filtro
 * server-side y las facetas (actions.server.ts), y el formatter de export
 * (_MaintenanceOrderDataTable.tsx). Si alguno queda desincronizado, el filtro
 * "Sector Actual" deja de coincidir con lo que el usuario ve en la tabla.
 */

export interface CurrentSectorItemLike {
  assigned_sector_id: string | null;
  sector_sequence_order: number | null;
  workshop_sectors?: { id: string; name: string | null } | null;
}

export interface CurrentSector {
  id: string;
  name: string;
}

/**
 * Calcula el sector actual de una orden a partir de sus items.
 *
 * Deduplica por sector (un mismo sector puede tener varios items) quedándose
 * con el primer `sector_sequence_order` visto para ese sector, y luego elige
 * el sector con el orden más bajo. `null` cuando ningún item tiene sector
 * asignado (la orden no tiene recorrido de taller definido todavía).
 */
export function computeCurrentSector(items: CurrentSectorItemLike[] | null | undefined): CurrentSector | null {
  const sectorMap = new Map<string, { name: string; order: number }>();

  for (const item of items ?? []) {
    const sectorId = item.assigned_sector_id;
    if (!sectorId) continue;
    const sectorName = item.workshop_sectors?.name ?? 'Sin nombre';
    if (!sectorMap.has(sectorId)) {
      sectorMap.set(sectorId, {
        name: sectorName,
        order: item.sector_sequence_order ?? 999,
      });
    }
  }

  if (sectorMap.size === 0) return null;

  const sorted = Array.from(sectorMap.entries()).sort((a, b) => a[1].order - b[1].order);
  const [id, { name }] = sorted[0];
  return { id, name };
}
