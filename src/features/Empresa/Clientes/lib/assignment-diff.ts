/**
 * Diferencias explícitas sobre relaciones M:M (afectaciones cliente ↔ recurso, áreas/sectores
 * de un contrato, provincias de un área).
 *
 * Regla del repo: al servidor viajan SIEMPRE ids explícitos de alta y de baja. La ausencia
 * de un id nunca implica borrado; estos helpers sólo calculan el delta que el usuario ve y
 * confirma antes de guardar (o el que el servidor aplica contra un baseline leído de la base).
 */
export interface AssignmentDiff {
  toAdd: string[];
  toRemove: string[];
}

export interface AssignmentChanges {
  add: string[];
  remove: string[];
}

/** Normaliza una lista de ids: recorta, descarta vacíos/nulos y deduplica conservando el orden. */
export function normalizeIds(ids: ReadonlyArray<string | null | undefined> | undefined | null): string[] {
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(ids.map((id) => String(id ?? '').trim()).filter(Boolean)));
}

/** Altas y bajas entre lo vigente (`current`) y la selección final (`next`). */
export function diffAssignments(
  current: ReadonlyArray<string | null | undefined>,
  next: ReadonlyArray<string | null | undefined> | undefined | null
): AssignmentDiff {
  const currentIds = normalizeIds(current);
  const nextIds = normalizeIds(next);
  const currentSet = new Set(currentIds);
  const nextSet = new Set(nextIds);

  return {
    toAdd: nextIds.filter((id) => !currentSet.has(id)),
    toRemove: currentIds.filter((id) => !nextSet.has(id)),
  };
}

/**
 * Normaliza un pedido explícito `{ add, remove }` del cliente. Un mismo id no puede pedirse
 * de alta y de baja a la vez: prevalece el alta.
 */
export function resolveAssignmentChanges(changes: Partial<AssignmentChanges> | undefined | null): AssignmentDiff {
  const toAdd = normalizeIds(changes?.add);
  const addSet = new Set(toAdd);
  const toRemove = normalizeIds(changes?.remove).filter((id) => !addSet.has(id));
  return { toAdd, toRemove };
}
