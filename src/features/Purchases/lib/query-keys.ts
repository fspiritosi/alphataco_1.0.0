/**
 * Claves de React Query de las tablas de Compras. Las tablas corren en client-side mode: despues
 * de mutar hay que invalidarlas (un `router.refresh()` solo no las actualiza).
 */
export const PURCHASES_QUERY_KEYS = {
  requests: ['purchase-requests'],
  suppliers: ['suppliers'],
} as const;
