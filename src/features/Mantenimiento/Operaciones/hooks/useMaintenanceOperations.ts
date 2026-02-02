import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApproveWorkshopEntryInput, RejectOperationInput } from '../../types';
import { approveWorkshopEntry, getMaintenanceOperations, rejectMaintenanceOperation } from '../actions/actionsServer';

export const MAINTENANCE_OPERATIONS_QUERY_KEY = ['maintenance-operations'];

/**
 * Hook para obtener operaciones planificadas
 */
export function useMaintenanceOperations() {
  return useQuery({
    queryKey: MAINTENANCE_OPERATIONS_QUERY_KEY,
    queryFn: () => getMaintenanceOperations(),
  });
}

/**
 * Hook para rechazar una operación
 */
export function useRejectMaintenanceOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectOperationInput) => rejectMaintenanceOperation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_OPERATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
    },
  });
}

/**
 * Hook para aprobar entrada a taller
 */
export function useApproveWorkshopEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApproveWorkshopEntryInput) => approveWorkshopEntry(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_OPERATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}
