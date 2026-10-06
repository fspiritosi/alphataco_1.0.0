/**
 * Claves de React Query de las tablas de Almacenes. Las tablas las usan como `queryKey` y los
 * formularios las invalidan despues de mutar (las tablas corren en client-side mode: un
 * `router.refresh()` solo no las actualiza).
 */
export const WAREHOUSE_QUERY_KEYS = {
  stock: ['warehouse-stock'],
  movements: ['warehouse-movements'],
  materials: ['warehouse-materials'],
  depots: ['warehouse-depots'],
  /** Disponible de un material en un deposito (lineas del formulario de movimientos). */
  availability: ['warehouse-availability'],
  /** Categorias y unidades (Configuracion). */
  settings: ['warehouse-settings'],
} as const;
