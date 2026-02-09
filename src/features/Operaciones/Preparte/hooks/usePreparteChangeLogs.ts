'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPreparteChangeLogs, getPreparteChangeLogsByOrderNumber } from '../actions/preparte';

// Tipo inferido de la respuesta
export type PreparteChangeLogEntry = Awaited<ReturnType<typeof getPreparteChangeLogs>>[number];

/**
 * Hook para obtener el historial de cambios de un preparte específico
 */
export function usePreparteChangeLogs(preparteId: string | undefined, isOpen = true) {
  return useQuery({
    queryKey: ['preparte-change-logs', preparteId],
    queryFn: async () => {
      if (!preparteId) return [];
      return getPreparteChangeLogs(preparteId);
    },
    enabled: !!preparteId && isOpen,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  });
}

/**
 * Hook para obtener el historial de cambios de todos los prepartes de un pedido
 * Útil para ver todos los cambios en el modal de detalle por número de pedido
 */
export function usePreparteChangeLogsByOrderNumber(numeroPedido: string | undefined) {
  return useQuery({
    queryKey: ['preparte-change-logs-order', numeroPedido],
    queryFn: async () => {
      if (!numeroPedido) return [];
      return getPreparteChangeLogsByOrderNumber(numeroPedido);
    },
    enabled: !!numeroPedido,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  });
}

/**
 * Hook para invalidar las queries de logs de preparte
 */
export function usePreparteChangeLogsInvalidation() {
  const queryClient = useQueryClient();

  const invalidateChangeLogs = (preparteId?: string, numeroPedido?: string) => {
    if (preparteId) {
      queryClient.invalidateQueries({ queryKey: ['preparte-change-logs', preparteId] });
    }
    if (numeroPedido) {
      queryClient.invalidateQueries({ queryKey: ['preparte-change-logs-order', numeroPedido] });
    }
    // Invalidar todas las queries de logs si no se especifica ninguno
    if (!preparteId && !numeroPedido) {
      queryClient.invalidateQueries({ queryKey: ['preparte-change-logs'] });
      queryClient.invalidateQueries({ queryKey: ['preparte-change-logs-order'] });
    }
  };

  return { invalidateChangeLogs };
}
