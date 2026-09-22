/**
 * Regla pura de la carrera de altas duplicadas (doble click, reintento del navegador).
 *
 * La validacion de unicidad del formulario es async y no es atomica con el insert: dos
 * requests en paralelo la pasan las dos. Despues de insertar se vuelve a mirar la tabla y,
 * si hay mas de un registro activo con el mismo dato (dominio, N° interno, N° de serie),
 * **gana el mas antiguo** y el mas nuevo se elimina a si mismo.
 *
 * El criterio `(created_at, id)` es determinista: ambas requests eligen el mismo ganador y
 * nunca se borran las dos. La misma regla la usan vehiculos y equipamientos.
 */

/** Ventana en la que dos altas del mismo dato se consideran la misma request repetida. */
export const DUPLICATE_RACE_WINDOW_MS = 10_000;

export interface RaceSibling {
  id: string;
  created_at: Date | string;
}

function toMillis(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/** Inicio de la ventana de duplicados para un registro recien creado. */
export function raceWindowStart(createdAt: Date | string): Date {
  return new Date(toMillis(createdAt) - DUPLICATE_RACE_WINDOW_MS);
}

/**
 * Ganador entre los registros activos que comparten el dato: el de `created_at` mas antiguo,
 * y a igual fecha el de `id` menor. Con menos de dos filas no hay carrera y devuelve `null`.
 */
export function pickDuplicateRaceWinner<T extends RaceSibling>(siblings: readonly T[]): T | null {
  if (siblings.length < 2) return null;
  const [winner] = [...siblings].sort((a, b) => {
    const diff = toMillis(a.created_at) - toMillis(b.created_at);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
  return winner;
}
