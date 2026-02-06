'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getDailyReportDeviations, type EmployeeDeviation, type EquipmentDeviation } from '../actions/actions';

export const VALIDATION_QUERY_KEY = ['daily-report-deviations'] as const;

/**
 * Hook para obtener desvíos del parte diario via RPC.
 * La RPC devuelve rows_with_deviations agrupados por row.
 * Este hook aplana los desvíos en maps employee_id:row_id y equipment_id:row_id
 * para acceso rápido por celda en la tabla.
 */
export function useValidationData(dailyReportId: string, reportDate: string) {
  const { data, isLoading } = useQuery({
    queryKey: [...VALIDATION_QUERY_KEY, dailyReportId, reportDate],
    queryFn: () => getDailyReportDeviations(dailyReportId, reportDate),
    enabled: !!dailyReportId && !!reportDate,
    staleTime: 30 * 1000, // 30 segundos, consistente con el hook de datos
  });

  // Aplanar rows_with_deviations en map de employee_id:row_id
  const employeeDeviationMap = useMemo(() => {
    const map = new Map<string, EmployeeDeviation>();
    if (!data?.rows_with_deviations) return map;
    for (const row of data.rows_with_deviations) {
      for (const dev of row.employee_deviations) {
        map.set(`${dev.employee_id}:${row.row_id}`, dev);
      }
    }
    return map;
  }, [data?.rows_with_deviations]);

  // Aplanar rows_with_deviations en map de equipment_id:row_id
  const equipmentDeviationMap = useMemo(() => {
    const map = new Map<string, EquipmentDeviation>();
    if (!data?.rows_with_deviations) return map;
    for (const row of data.rows_with_deviations) {
      for (const dev of row.equipment_deviations) {
        map.set(`${dev.equipment_id}:${row.row_id}`, dev);
      }
    }
    return map;
  }, [data?.rows_with_deviations]);

  // Helper: obtener desvíos de un empleado en una fila específica
  const getEmployeeDeviation = (employeeId: string, rowId: string): EmployeeDeviation | null => {
    return employeeDeviationMap.get(`${employeeId}:${rowId}`) ?? null;
  };

  // Helper: obtener desvíos de un equipo en una fila específica
  const getEquipmentDeviation = (equipmentId: string, rowId: string): EquipmentDeviation | null => {
    return equipmentDeviationMap.get(`${equipmentId}:${rowId}`) ?? null;
  };

  return {
    isLoading,
    getEmployeeDeviation,
    getEquipmentDeviation,
  };
}
