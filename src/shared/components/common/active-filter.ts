/**
 * Derivación de la lista visible del toggle activos/inactivos (`VerActivosButton`).
 *
 * Vive aparte del componente a propósito: el padre la llama dentro de un `useMemo` para
 * **derivar** en cada render en vez de guardar el resultado en un `useState`. Cuando el
 * resultado se guardaba en estado, un alta seguida de `router.refresh()` traía datos nuevos
 * pero la tabla seguía mostrando el array viejo.
 */
export function filterByActiveFlag<T extends object>(
  data: readonly T[] | null | undefined,
  filterKey: keyof T,
  showActive: boolean
): T[] {
  if (!data) return [];
  return data.filter((item) => Boolean(item[filterKey]) === showActive);
}
