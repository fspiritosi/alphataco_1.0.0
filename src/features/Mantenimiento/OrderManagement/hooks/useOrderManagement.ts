'use client';

import { useQuery } from '@tanstack/react-query';
import { getMaintenanceOrdersForManagement, type OrderManagementData } from '../actions/queries.server';

export const ORDER_MANAGEMENT_QUERY_KEY = ['maintenance', 'order-management'] as const;

export function useOrderManagement(initialData?: OrderManagementData) {
  return useQuery({
    queryKey: [...ORDER_MANAGEMENT_QUERY_KEY],
    queryFn: () => getMaintenanceOrdersForManagement(),
    initialData,
  });
}
