import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalida todas las queries de mantenimiento de una vez.
 * Util para acciones que afectan multiples tabs (ej: generar OT, aprobar tareas).
 */
export function invalidateAllMaintenanceQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['maintenance'] });
  queryClient.invalidateQueries({ queryKey: ['maintenance', 'order-management'] });
  queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
  queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  queryClient.invalidateQueries({ queryKey: ['equipment'] });
}
