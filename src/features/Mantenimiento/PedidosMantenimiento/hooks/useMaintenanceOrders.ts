import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MaintenanceOrderFilters, ScheduleOrderInput } from '../../types';
import { invalidateAllMaintenanceQueries } from '../../utils/queryInvalidation';
import { getMaintenanceOrders, scheduleMaintenanceOrder } from '../actions/actionsServer';

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
