import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveWorkshopEntry } from '../../Operaciones/actions/actionsServer';
import type { ApproveRequestItemsInput, ApproveWorkshopEntryInput, RejectRequestInput } from '../../types';
import { invalidateAllMaintenanceQueries } from '../../utils/queryInvalidation';
import {
  approveMaintenanceRequestItems,
  rejectMaintenanceRequest,
  rejectMaintenanceRequestItems,
} from '../actions/actionsServer';

export const MAINTENANCE_REQUESTS_QUERY_KEY = ['maintenance-requests'];

/**
 * Hook para aprobar items de una solicitud
 */
export function useApproveMaintenanceRequestItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApproveRequestItemsInput) => approveMaintenanceRequestItems(input),
    onSuccess: () => {
      invalidateAllMaintenanceQueries(queryClient);
    },
  });
}

/**
 * Hook para rechazar una solicitud completa
 * @deprecated Usar useRejectMaintenanceRequestItems para rechazar items específicos
 */
export function useRejectMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectRequestInput) => rejectMaintenanceRequest(input),
    onSuccess: () => {
      invalidateAllMaintenanceQueries(queryClient);
    },
  });
}

/**
 * Hook para rechazar items específicos de una solicitud
 * Permite rechazo selectivo (item por item)
 */
export function useRejectMaintenanceRequestItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { requestId: string; itemIds: string[]; reason: string }) =>
      rejectMaintenanceRequestItems(input),
    onSuccess: () => {
      invalidateAllMaintenanceQueries(queryClient);
    },
  });
}

/**
 * Hook para aprobar entrada a taller desde Solicitudes de Mantenimiento
 * Usado cuando una solicitud tiene fecha confirmada (date_confirmed)
 */
export function useApproveWorkshopEntryFromRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApproveWorkshopEntryInput) => approveWorkshopEntry(input),
    onSuccess: () => {
      invalidateAllMaintenanceQueries(queryClient);
    },
  });
}
