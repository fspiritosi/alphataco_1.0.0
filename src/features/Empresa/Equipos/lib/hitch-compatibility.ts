/**
 * Reglas de enganche y compatibilidad entre tipos y subtipos de equipo (módulo puro, testeado).
 *
 * Modelo de datos:
 * - `type_hitch_types` (tipo padre ↔ tipos que puede enganchar): sólo tiene sentido si el tipo
 *   padre es unidad tractora **y** tiene enganche.
 * - `sub_type_compatible_items` (subtipo ↔ item compatible): el item es un `sub_type` o, cuando
 *   el tipo enganchable no tiene subtipos cargados, el `type` entero. Por eso la pivote lleva
 *   `item_type` además del id.
 *
 * El formulario transporta cada item como la clave `"<item_type>:<id>"` en un único multi-select.
 */

/** Item compatible de un subtipo: un subtipo concreto o un tipo entero. */
export type CompatibleItemType = 'sub_type' | 'type';

export interface CompatibleItem {
  id: string;
  type: CompatibleItemType;
}

/** Un tipo sólo ofrece items compatibles si es unidad tractora Y tiene enganche. */
export function canHaveCompatibleItems(
  type: { is_tractor_unit?: boolean | null; has_hitch?: boolean | null } | null | undefined
): boolean {
  if (!type) return false;
  return Boolean(type.is_tractor_unit) && Boolean(type.has_hitch);
}

/**
 * Enganches efectivos de un tipo: si el tipo dejó de ser tractor o de tener enganche, sus
 * `type_hitch_types` no se persisten (mismo criterio que usan `createEquipmentType` /
 * `updateEquipmentType` al guardar).
 */
export function effectiveHitchTypeIds(
  type: { is_tractor_unit?: boolean | null; has_hitch?: boolean | null },
  hitchTypeIds: readonly string[]
): string[] {
  if (!canHaveCompatibleItems(type)) return [];
  return dedupe(hitchTypeIds);
}

/**
 * De los tipos enganchables, los que NO tienen ningún subtipo cargado: esos se ofrecen como
 * item compatible "tipo entero", porque si no quedarían sin forma de seleccionarse.
 */
export function typeIdsWithoutSubTypes(
  compatibleTypeIds: readonly string[],
  subTypes: readonly { type: string | null }[]
): string[] {
  const withSubTypes = new Set(subTypes.map((st) => st.type).filter((id): id is string => Boolean(id)));
  return dedupe(compatibleTypeIds).filter((id) => !withSubTypes.has(id));
}

/** `{ id, type }` → `"type:id"`, la clave que viaja en el multi-select del formulario. */
export function formatCompatibleItemKey(item: CompatibleItem): string {
  return `${item.type}:${item.id}`;
}

/**
 * `"type:id"` → `{ id, type }`. Descarta las claves malformadas o con un `item_type`
 * desconocido: el valor llega del cliente y termina en una escritura.
 */
export function parseCompatibleItemKeys(keys: readonly string[]): CompatibleItem[] {
  const items: CompatibleItem[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const separator = key.indexOf(':');
    if (separator <= 0) continue;
    const type = key.slice(0, separator);
    const id = key.slice(separator + 1);
    if (!id) continue;
    if (type !== 'sub_type' && type !== 'type') continue;
    const normalized = `${type}:${id}`;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    items.push({ id, type });
  }
  return items;
}

function dedupe(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
