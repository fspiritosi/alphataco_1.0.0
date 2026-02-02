'use client';

import { useQuery } from '@tanstack/react-query';
import { getMaintenanceOrdersInWorkshop, type MaintenanceOrdersInWorkshopData } from '../../actions/actionsServer';

export const PLANIFICACION_QUERY_KEY = ['maintenance', 'planificacion'];

export function usePlanificacion(initialData?: MaintenanceOrdersInWorkshopData) {
  return useQuery({
    queryKey: PLANIFICACION_QUERY_KEY,
    queryFn: () => getMaintenanceOrdersInWorkshop(),
    initialData,
  });
}
