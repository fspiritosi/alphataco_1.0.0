import type { QueryClient } from '@tanstack/react-query';
import { PURCHASES_QUERY_KEYS } from './query-keys';

/**
 * Despues de mutar algo de Compras se invalidan las tres tablas: una OC cambia el avance de sus
 * solicitudes, una cotizacion genera OC, etc. (las tablas corren en client-side mode: un
 * `router.refresh()` solo no las actualiza).
 */
export function invalidatePurchases(queryClient: QueryClient): void {
  for (const queryKey of [PURCHASES_QUERY_KEYS.requests, PURCHASES_QUERY_KEYS.quotes, PURCHASES_QUERY_KEYS.orders]) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
