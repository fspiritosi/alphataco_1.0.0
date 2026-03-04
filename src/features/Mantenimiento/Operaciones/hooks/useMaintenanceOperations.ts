import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApproveWorkshopEntryInput, RejectOperationInput } from '../../types';
import { invalidateAllMaintenanceQueries } from '../../utils/queryInvalidation';
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
 * Hook para rechazar una operación (fecha rechazada → vuelve a pendientes)
 */
export function useRejectMaintenanceOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectOperationInput) => rejectMaintenanceOperation(input),
    onSuccess: () => {
      invalidateAllMaintenanceQueries(queryClient);
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
      invalidateAllMaintenanceQueries(queryClient);
    },
  });
}
