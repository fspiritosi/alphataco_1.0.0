import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalida todas las queries de mantenimiento de una vez.
 * Util para acciones que afectan multiples tabs (ej: generar OT, aprobar tareas).
 */
export function invalidateAllMaintenanceQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['maintenance'] });
  queryClient.invalidateQueries({ queryKey: ['maintenance', 'order-management'] });
  queryClient.invalidateQueries({ queryKey: ['maintenance', 'ordenes-mantenimiento'] });
  queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
  queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
  queryClient.invalidateQueries({ queryKey: ['maintenance-operations'] });
  queryClient.invalidateQueries({ queryKey: ['equipments-with-deviations'] });
  queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
  queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  queryClient.invalidateQueries({ queryKey: ['equipment'] });
  // Panel del operario
  queryClient.invalidateQueries({ queryKey: ['operator-work-orders'] });
  queryClient.invalidateQueries({ queryKey: ['operator-work-order'] });
  queryClient.invalidateQueries({ queryKey: ['operator-work-orders-completed'] });
}
