'use client';

import { useQuery } from '@tanstack/react-query';
import { getMaintenanceOrders, type MaintenanceOrdersData } from '../../MaintenanceOrders/actions/actionsServer';

export const WORKSHOP_TRACKING_QUERY_KEY = ['maintenance', 'seguimiento-taller'] as const;

export function useWorkshopTracking(initialData?: MaintenanceOrdersData) {
  return useQuery({
    queryKey: [...WORKSHOP_TRACKING_QUERY_KEY],
    queryFn: () => getMaintenanceOrders(),
    initialData,
  });
}
