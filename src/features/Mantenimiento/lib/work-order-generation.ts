/**
 * Lógica pura de generación de órdenes de trabajo (OT) a partir de los ítems de un pedido.
 *
 * Módulo sin acceso a datos: recibe los ítems ya leídos y decide cuáles son elegibles,
 * cómo se agrupan (un grupo = una OT) y cómo se numera la OT resultante.
 */

/** Tipo de reparación mínimo que consume el agrupador (viene de `types_of_repairs`). */
export interface GroupableRepairType {
  id: string;
  name: string;
  autorizable: boolean | null;
}

/** Ítem de `maintenance_order_items` reducido a lo que decide el agrupamiento. */
export interface GroupableOrderItem {
  id: string;
  assigned_sector_id: string | null;
  assigned_workshop_id: string | null;
  is_diagnostico: boolean;
  is_rejected: boolean;
  work_order_id: string | null;
  workshop_sectors: { id: string; name: string } | null;
  workshops: { id: string; name: string; type: string } | null;
  maintenance_order_item_repair_types?: { repair_type_id: string; types_of_repairs?: GroupableRepairType | null }[];
  types_of_repairs?: GroupableRepairType | null;
}

/** Un grupo = una OT a generar. */
export interface SectorGroup<T extends GroupableOrderItem> {
  /** Sector interno; cadena vacía cuando el grupo es de un taller externo. */
  sectorId: string;
  /** Nombre a mostrar (sector interno o taller externo). */
  sectorName: string;
  isExternal: boolean;
  workshopId: string | null;
  workshopName: string | null;
  items: T[];
  totalRepairs: number;
}

const DEFAULT_SECTOR_NAME = 'Sin nombre';
const DEFAULT_EXTERNAL_WORKSHOP_NAME = 'Taller Externo';

/**
 * Un ítem genera OT si no es diagnóstico, no fue rechazado, tiene destino asignado
 * (sector interno o taller externo) y todavía no tiene OT.
 */
export function isEligibleForWorkOrder(item: GroupableOrderItem): boolean {
  if (item.is_diagnostico) return false;
  if (item.is_rejected) return false;
  if (item.work_order_id) return false;
  return Boolean(item.assigned_sector_id ?? item.assigned_workshop_id);
}

/** Cantidad de reparaciones del ítem: la pivote manda; si está vacía, el tipo legacy cuenta 1. */
export function countItemRepairs(item: GroupableOrderItem): number {
  const pivotTypes = item.maintenance_order_item_repair_types ?? [];
  if (pivotTypes.length > 0) return pivotTypes.length;
  return item.types_of_repairs ? 1 : 0;
}

/** Clave del grupo: el sector interno, o `ext-<workshopId>` para los talleres externos. */
export function sectorGroupKey(item: GroupableOrderItem): string {
  const isExternal = !item.assigned_sector_id && Boolean(item.assigned_workshop_id);
  return isExternal ? `ext-${item.assigned_workshop_id}` : (item.assigned_sector_id ?? '');
}

/**
 * Agrupa los ítems elegibles por destino: un grupo por sector interno y uno por taller externo.
 * Preserva el orden de aparición tanto de los grupos como de los ítems dentro de cada grupo.
 */
export function groupItemsBySector<T extends GroupableOrderItem>(items: readonly T[]): Map<string, SectorGroup<T>> {
  const groups = new Map<string, SectorGroup<T>>();

  for (const item of items) {
    if (!isEligibleForWorkOrder(item)) continue;

    const isExternal = !item.assigned_sector_id && Boolean(item.assigned_workshop_id);
    const groupKey = sectorGroupKey(item);

    let group = groups.get(groupKey);
    if (!group) {
      const workshopName = isExternal ? (item.workshops?.name ?? DEFAULT_EXTERNAL_WORKSHOP_NAME) : null;
      group = {
        sectorId: isExternal ? '' : (item.assigned_sector_id ?? ''),
        sectorName: isExternal ? workshopName! : (item.workshop_sectors?.name ?? DEFAULT_SECTOR_NAME),
        isExternal,
        workshopId: isExternal ? item.assigned_workshop_id : null,
        workshopName,
        items: [],
        totalRepairs: 0,
      };
      groups.set(groupKey, group);
    }

    group.items.push(item);
    group.totalRepairs += countItemRepairs(item);
  }

  return groups;
}

/**
 * Número de OT: `OT-{IDENTIFICADOR}-{SECTOR}-{SECUENCIA}`.
 * El identificador sale del recurso (patente/serie/interno) y el sector se recorta a 12 letras.
 */
export function buildWorkOrderNumber(input: {
  resourceLabel: string;
  sectorName: string;
  sequenceNumber: number;
}): string {
  const cleanIdentifier = input.resourceLabel.replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'EQUIPO';
  const cleanSector = input.sectorName.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 12);
  const paddedNumber = String(input.sequenceNumber).padStart(6, '0');
  return `OT-${cleanIdentifier}-${cleanSector}-${paddedNumber}`;
}
