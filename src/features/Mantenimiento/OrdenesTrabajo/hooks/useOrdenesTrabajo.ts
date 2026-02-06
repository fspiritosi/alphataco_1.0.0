'use client';

import { useQuery } from '@tanstack/react-query';
import { getWorkOrderDetail, getWorkOrders } from '../actions/actionsServer';

export const ORDENES_TRABAJO_QUERY_KEY = ['ordenes-trabajo'];

/**
 * Hook para obtener órdenes de trabajo con filtro opcional por estado
 */
export function useOrdenesTrabajo(status?: string | string[]) {
  return useQuery({
    queryKey: [...ORDENES_TRABAJO_QUERY_KEY, status],
    queryFn: () => getWorkOrders(status),
  });
}

/**
 * Hook para obtener el detalle de una orden de trabajo
 */
export function useOrdenTrabajoDetail(workOrderId: string | null) {
  return useQuery({
    queryKey: [...ORDENES_TRABAJO_QUERY_KEY, 'detail', workOrderId],
    queryFn: () => (workOrderId ? getWorkOrderDetail(workOrderId) : null),
    enabled: !!workOrderId,
  });
}
