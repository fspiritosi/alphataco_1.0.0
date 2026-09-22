'use client';

import { useQuery } from '@tanstack/react-query';
import { getMaintenanceOrderDetail, getMaintenanceOrders, type MaintenanceOrdersData } from '../actions/queries.server';

export const MAINTENANCE_ORDERS_QUERY_KEY = ['maintenance', 'ordenes-mantenimiento'] as const;

export function useMaintenanceOrders(initialData?: MaintenanceOrdersData, statusFilter?: string) {
  return useQuery({
    queryKey: [...MAINTENANCE_ORDERS_QUERY_KEY, statusFilter],
    queryFn: () => getMaintenanceOrders(statusFilter),
    initialData,
  });
}

export function useMaintenanceOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: [...MAINTENANCE_ORDERS_QUERY_KEY, 'detalle', orderId],
    queryFn: () => (orderId ? getMaintenanceOrderDetail(orderId) : null),
    enabled: !!orderId,
  });
}
