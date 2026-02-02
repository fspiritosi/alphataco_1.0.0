import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MaintenanceOrderFilters, ScheduleOrderInput } from '../../types';
import { getMaintenanceOrders, scheduleMaintenanceOrder } from '../actions/actionsServer';

export const MAINTENANCE_ORDERS_QUERY_KEY = ['maintenance-orders'];
export const PEDIDOS_PENDIENTES_QUERY_KEY = ['maintenance', 'pedidos', 'pendientes'];

/**
 * Hook para obtener pedidos de mantenimiento
 */
export function useMaintenanceOrders(filters?: MaintenanceOrderFilters) {
  return useQuery({
    queryKey: [...MAINTENANCE_ORDERS_QUERY_KEY, filters],
    queryFn: () => getMaintenanceOrders(filters),
  });
}

/**
 * Hook para planificar un pedido
 */
export function useScheduleMaintenanceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ScheduleOrderInput) => scheduleMaintenanceOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PEDIDOS_PENDIENTES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['maintenance-operations'] });
    },
  });
}
