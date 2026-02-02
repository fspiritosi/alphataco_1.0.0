'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getMaintenanceOrdersPendingApproval,
  type MaintenanceOrdersPendingApprovalData,
} from '../../actions/actionsServer';

export const PENDIENTES_EJECUTAR_QUERY_KEY = ['maintenance', 'pendientes-ejecutar'];

export function usePendientesEjecutar(initialData?: MaintenanceOrdersPendingApprovalData) {
  return useQuery({
    queryKey: PENDIENTES_EJECUTAR_QUERY_KEY,
    queryFn: () => getMaintenanceOrdersPendingApproval(),
    initialData,
  });
}
