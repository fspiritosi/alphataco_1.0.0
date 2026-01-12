'use client';

import { Logger } from '@/lib/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DailyReportRowData } from '../actions/actions';
import { updateDailyReportRowBody, updateDailyReportRowStatus } from '../actions/actions';

const logger = new Logger('useDailyReportMutations');

/**
 * Query key para el daily report - debe coincidir con el usado en DayliReportDetailTableServer
 */
export const dailyReportQueryKeys = {
  byId: (dailyReportId: string) => [`daily-report-server-${dailyReportId}`] as const,
};

/**
 * Hook para actualizar el body de una fila del daily report
 * Usado principalmente para actualizar turnos completados (completed_day, completed_night)
 */
export function useUpdateDailyReportRowBody(dailyReportId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DailyReportRowData> }) => updateDailyReportRowBody(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dailyReportQueryKeys.byId(dailyReportId),
      });
    },
    onError: (error: Error) => {
      logger.error('Error al actualizar fila del daily report', { data: { error: error.message } });
      toast.error(error.message || 'Error al actualizar el registro');
    },
  });
}

/**
 * Hook para actualizar el status de múltiples filas del daily report
 * Usado para cambios masivos de estado (ejecutado, cancelado, reprogramado, etc.)
 */
export function useUpdateDailyReportRowStatus(dailyReportId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) => updateDailyReportRowStatus(ids, status as any),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dailyReportQueryKeys.byId(dailyReportId),
      });
    },
    onError: (error: Error) => {
      logger.error('Error al actualizar estados del daily report', { data: { error: error.message } });
      toast.error(error.message || 'Error al actualizar los registros');
    },
  });
}
