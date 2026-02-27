'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  DailyReportEmployeeRelation,
  DailyReportEquipmentRelation,
  DailyReportRowBase,
  fetchDailyReportEmployeeRelations,
  fetchDailyReportEquipmentRelations,
  fetchDailyReportRowsBase,
} from '../actions/server-actions';
import { VALIDATION_QUERY_KEY } from './useValidationData';

// Query keys para el detalle del parte diario
export const dailyReportDetailQueryKeys = {
  all: (dailyReportId: string) => ['daily-report-detail', dailyReportId] as const,
  rows: (dailyReportId: string) => ['daily-report-detail', dailyReportId, 'rows'] as const,
  employees: (dailyReportId: string) => ['daily-report-detail', dailyReportId, 'employees'] as const,
  equipment: (dailyReportId: string) => ['daily-report-detail', dailyReportId, 'equipment'] as const,
};

// Tipo combinado para una fila con todas sus relaciones
export type DailyReportRowCombined = DailyReportRowBase & {
  dailyreportemployeerelations: Array<{
    id: string;
    employee_id: string | null;
    role: string | null;
    employees: DailyReportEmployeeRelation['employees'] | null;
  }> | null;
  dailyreportequipmentrelations: Array<{
    id: string;
    equipment_id: string | null;
    other_equipment_id: string | null;
    vehicles: DailyReportEquipmentRelation['vehicles'] | null;
    other_equipment: DailyReportEquipmentRelation['other_equipment'] | null;
  }> | null;
};

// Stale time de 30 segundos como indicó el usuario
const STALE_TIME = 30 * 1000;

/**
 * Hook para obtener los datos del detalle del parte diario
 * Usa queries separadas para datos base, empleados y equipos
 * Combina los datos client-side para permitir ordenamiento completo
 */
export function useDailyReportDetailData(dailyReportId: string) {
  // Query 1: Datos base (sin relaciones pesadas) - se carga primero
  const rowsQuery = useQuery({
    queryKey: dailyReportDetailQueryKeys.rows(dailyReportId),
    queryFn: () => fetchDailyReportRowsBase(dailyReportId),
    staleTime: STALE_TIME,
    enabled: !!dailyReportId,
  });

  // Query 2: Relaciones de empleados - se carga en paralelo
  const employeesQuery = useQuery({
    queryKey: dailyReportDetailQueryKeys.employees(dailyReportId),
    queryFn: () => fetchDailyReportEmployeeRelations(dailyReportId),
    staleTime: STALE_TIME,
    enabled: !!dailyReportId,
  });

  // Query 3: Relaciones de equipos - se carga en paralelo
  const equipmentQuery = useQuery({
    queryKey: dailyReportDetailQueryKeys.equipment(dailyReportId),
    queryFn: () => fetchDailyReportEquipmentRelations(dailyReportId),
    staleTime: STALE_TIME,
    enabled: !!dailyReportId,
  });

  // Combinar datos cuando estén listos
  const combinedData = useMemo<DailyReportRowCombined[]>(() => {
    if (!rowsQuery.data) return [];

    const employeesByRowId = new Map<string, DailyReportEmployeeRelation[]>();
    const equipmentByRowId = new Map<string, DailyReportEquipmentRelation[]>();

    // Agrupar empleados por row_id
    if (employeesQuery.data) {
      employeesQuery.data.forEach((rel) => {
        const rowId = rel.daily_report_row_id;
        if (rowId) {
          if (!employeesByRowId.has(rowId)) {
            employeesByRowId.set(rowId, []);
          }
          employeesByRowId.get(rowId)!.push(rel);
        }
      });
    }

    // Agrupar equipos por row_id
    if (equipmentQuery.data) {
      equipmentQuery.data.forEach((rel) => {
        const rowId = rel.daily_report_row_id;
        if (rowId) {
          if (!equipmentByRowId.has(rowId)) {
            equipmentByRowId.set(rowId, []);
          }
          equipmentByRowId.get(rowId)!.push(rel);
        }
      });
    }

    // Combinar datos
    return rowsQuery.data.map((row) => ({
      ...row,
      dailyreportemployeerelations: employeesByRowId.get(row.id) || null,
      dailyreportequipmentrelations: equipmentByRowId.get(row.id) || null,
    }));
  }, [rowsQuery.data, employeesQuery.data, equipmentQuery.data]);

  return {
    // Datos combinados
    data: combinedData,
    // Estados de carga
    isLoading: rowsQuery.isLoading,
    isLoadingEmployees: employeesQuery.isLoading,
    isLoadingEquipment: equipmentQuery.isLoading,
    // Todos los datos están listos
    isFullyLoaded: !rowsQuery.isLoading && !employeesQuery.isLoading && !equipmentQuery.isLoading,
    // Errores
    error: rowsQuery.error || employeesQuery.error || equipmentQuery.error,
    // Datos crudos para acceso directo si es necesario
    rawRows: rowsQuery.data,
    rawEmployees: employeesQuery.data,
    rawEquipment: equipmentQuery.data,
    // Refetch functions
    refetchRows: rowsQuery.refetch,
    refetchEmployees: employeesQuery.refetch,
    refetchEquipment: equipmentQuery.refetch,
    refetchAll: async () => {
      await Promise.all([rowsQuery.refetch(), employeesQuery.refetch(), equipmentQuery.refetch()]);
    },
  };
}

/**
 * Hook para invalidar todas las queries del detalle del parte diario
 * Usar desde preparte o cualquier otro lugar que modifique los datos
 */
export function useInvalidateDailyReportDetail() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalida todas las queries de un parte diario específico
     */
    invalidate: async (dailyReportId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dailyReportDetailQueryKeys.rows(dailyReportId),
        }),
        queryClient.invalidateQueries({
          queryKey: dailyReportDetailQueryKeys.employees(dailyReportId),
        }),
        queryClient.invalidateQueries({
          queryKey: dailyReportDetailQueryKeys.equipment(dailyReportId),
        }),
        // También invalidar la query legacy por si acaso
        queryClient.invalidateQueries({
          queryKey: [`daily-report-server-${dailyReportId}`],
        }),
        // Invalidar desvíos (RPC) para que se recalculen
        queryClient.invalidateQueries({
          queryKey: [...VALIDATION_QUERY_KEY, dailyReportId],
        }),
      ]);
    },
    /**
     * Invalida las queries de todos los partes diarios
     */
    invalidateAll: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['daily-report-detail'],
      });
    },
  };
}
