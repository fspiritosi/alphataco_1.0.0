import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveWorkshopEntry } from '../../Operaciones/actions/actionsServer';
import type {
  ApproveRequestItemsInput,
  ApproveWorkshopEntryInput,
  MaintenanceRequestFilters,
  RejectRequestInput,
} from '../../types';
import {
  approveMaintenanceRequestItems,
  getMaintenanceRequests,
  rejectMaintenanceRequest,
  rejectMaintenanceRequestItems,
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
      // Invalidar la vista de Solicitudes (esta tabla)
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_REQUESTS_QUERY_KEY });
      // Invalidar todas las vistas de Pedidos de Mantenimiento
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'pedidos'] }); // Incluye pendientes y confirmados
      // Invalidar la tab de Equipos con Desvíos ya que los items aprobados ya no deben aparecer ahí
      queryClient.invalidateQueries({ queryKey: ['equipments-with-deviations'] });
      // Invalidar Pendientes de Ejecutar para que aparezcan los items recién aprobados
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'pendientes-ejecutar'] });
      // Invalidar Planificación
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'planificacion'] });
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
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_REQUESTS_QUERY_KEY });
      // Los items rechazados deberían volver a aparecer en Equipos con Desvíos
      queryClient.invalidateQueries({ queryKey: ['equipments-with-deviations'] });
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
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_REQUESTS_QUERY_KEY });
      // Los items rechazados deberían volver a aparecer en Equipos con Desvíos
      queryClient.invalidateQueries({ queryKey: ['equipments-with-deviations'] });
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
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_REQUESTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders-pending-approval'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}
