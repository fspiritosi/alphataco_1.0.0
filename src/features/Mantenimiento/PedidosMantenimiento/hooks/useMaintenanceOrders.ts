import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MaintenanceOrderFilters, RejectPendingOrderInput, ScheduleOrderInput } from '../../types';
import { invalidateAllMaintenanceQueries } from '../../utils/queryInvalidation';
import { getMaintenanceOrders, rejectPendingOrder, scheduleMaintenanceOrder } from '../actions/actionsServer';

export const PEDIDOS_MANTENIMIENTO_QUERY_KEY = ['maintenance-orders'];
export const PEDIDOS_PENDIENTES_QUERY_KEY = ['maintenance', 'pedidos', 'pendientes'];

/**
 * Hook para obtener pedidos de mantenimiento
 */
export function useMaintenanceOrders(filters?: MaintenanceOrderFilters) {
  return useQuery({
    queryKey: [...PEDIDOS_MANTENIMIENTO_QUERY_KEY, filters],
    queryFn: () => getMaintenanceOrders(filters),
  });
}

/**
 * Hook para planificar un pedido (proponer fecha → viaja a aprobación de fecha)
 */
export function useScheduleMaintenanceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ScheduleOrderInput) => scheduleMaintenanceOrder(input),
    onSuccess: () => {
      invalidateAllMaintenanceQueries(queryClient);
    },
  });
}

/**
 * Hook para rechazar un pedido del paso "Por Programar" (ticket 676).
 * El pedido sale del listado y queda en el historial del equipo.
 */
export function useRejectPendingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectPendingOrderInput) => rejectPendingOrder(input),
    onSuccess: () => {
      invalidateAllMaintenanceQueries(queryClient);
    },
  });
}
