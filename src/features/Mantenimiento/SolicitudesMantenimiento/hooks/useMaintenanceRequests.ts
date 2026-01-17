import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApproveRequestItemsInput, MaintenanceRequestFilters, RejectRequestInput } from '../../types';
import {
  approveMaintenanceRequestItems,
  getMaintenanceRequests,
  rejectMaintenanceRequest,
} from '../actions/actionsServer';

export const MAINTENANCE_REQUESTS_QUERY_KEY = ['maintenance-requests'];

/**
 * Hook para obtener solicitudes de mantenimiento
 */
export function useMaintenanceRequests(filters?: MaintenanceRequestFilters) {
  return useQuery({
    queryKey: [...MAINTENANCE_REQUESTS_QUERY_KEY, filters],
    queryFn: () => getMaintenanceRequests(filters),
  });
}

/**
 * Hook para aprobar items de una solicitud
 */
export function useApproveMaintenanceRequestItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApproveRequestItemsInput) => approveMaintenanceRequestItems(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_REQUESTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
    },
  });
}

/**
 * Hook para rechazar una solicitud completa
 */
export function useRejectMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectRequestInput) => rejectMaintenanceRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_REQUESTS_QUERY_KEY });
    },
  });
}
