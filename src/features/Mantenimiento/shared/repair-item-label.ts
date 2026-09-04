/**
 * Titulo visible de un item de reparacion.
 *
 * Un item puede venir de tres origenes distintos y cada uno guarda su texto en
 * otro lado (ticket 592):
 *   - checklist  -> `checklist_deviations.item_label`
 *   - carga manual con tarea del listado -> `types_of_repairs.name`
 *   - carga manual con texto libre       -> `free_text`
 *
 * Sin este helper cada dialogo leia solo `item_label` y los items manuales
 * aparecian como "Sin titulo" / "Sin etiqueta" / "Item sin descripcion".
 */

type DeviationShape = { item_label?: string | null } | null | undefined;

type GroupShape = { name?: string | null } | null | undefined;

type RequestItemShape =
  | {
      free_text?: string | null;
      description?: string | null;
      checklist_deviations?: DeviationShape;
      maintenance_request_groups?: GroupShape;
    }
  | null
  | undefined;

export type RepairItemLike = {
  description?: string | null;
  free_text?: string | null;
  checklist_deviations?: DeviationShape;
  types_of_repairs?: { name?: string | null } | null;
  maintenance_order_item_repair_types?: { types_of_repairs?: { name?: string | null } | null }[] | null;
  maintenance_request_groups?: GroupShape;
  maintenance_request_items?: RequestItemShape;
};

/** Primer tipo de reparacion asociado, sea por la pivote o por el campo legacy */
function getRepairTypeName(item: RepairItemLike): string | null {
  const fromPivot = item.maintenance_order_item_repair_types?.map((rt) => rt.types_of_repairs?.name).find(Boolean);
  return fromPivot ?? item.types_of_repairs?.name ?? null;
}

/**
 * @param fallback texto a mostrar cuando el item no tiene ningun titulo
 */
export function getRepairItemLabel(item: RepairItemLike, fallback = 'Ítem sin descripción'): string {
  const request = item.maintenance_request_items;

  const label =
    item.checklist_deviations?.item_label ??
    request?.checklist_deviations?.item_label ??
    request?.free_text ??
    item.free_text ??
    getRepairTypeName(item) ??
    request?.description ??
    item.description;

  return label?.trim() || fallback;
}

/**
 * Texto secundario del item: la aclaracion que escribio quien lo cargo.
 * Se omite cuando repite el titulo, para no mostrar la misma frase dos veces.
 */
export function getRepairItemDescription(item: RepairItemLike): string | null {
  const label = getRepairItemLabel(item, '');
  const description = item.maintenance_request_items?.description ?? item.description ?? null;
  const trimmed = description?.trim();
  if (!trimmed || trimmed === label) return null;
  return trimmed;
}

/** Fotos del item, vengan de la orden o de la solicitud que la origino */
export function getRepairItemImages(item: RepairItemLike & { images?: string[] | null }): string[] {
  const fromOrder = item.images;
  if (fromOrder && fromOrder.length > 0) return fromOrder;
  const fromRequest = (item.maintenance_request_items as { images?: string[] | null } | undefined)?.images;
  return fromRequest ?? [];
}

/**
 * Nombre del grupo de reparaciones del que salio el item, o null si se cargo suelto.
 *
 * El grupo se persiste en `maintenance_group_id` al expandirlo (no se deriva de la
 * pivote `maintenance_group_type_of_repairs`, porque un mismo tipo de reparacion puede
 * pertenecer a varios grupos y el origen real quedaria ambiguo).
 *
 * Un item de orden hereda el grupo del item de solicitud que lo origino, asi que se
 * busca primero en el propio item y despues en la solicitud.
 */
export function getRepairItemGroupName(item: RepairItemLike): string | null {
  const name =
    item.maintenance_request_groups?.name ?? item.maintenance_request_items?.maintenance_request_groups?.name;
  return name?.trim() || null;
}
