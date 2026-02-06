'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getDailyReportDeviations, type EmployeeDeviation, type EquipmentDeviation } from '../actions/actions';

export const VALIDATION_QUERY_KEY = ['daily-report-deviations'] as const;

/**
 * Hook para obtener desvíos del parte diario via RPC.
 * Una sola query SQL devuelve todos los desvíos de empleados y equipos:
 * - Duplicados (empleado/equipo en múltiples filas)
 * - No asignado al cliente de la fila
 * - Sin diagrama cargado (empleados)
 * - Día no laboral (empleados)
 * - Condición del vehículo (equipos)
 */
export function useValidationData(dailyReportId: string, reportDate: string) {
  const { data, isLoading } = useQuery({
    queryKey: [...VALIDATION_QUERY_KEY, dailyReportId, reportDate],
    queryFn: () => getDailyReportDeviations(dailyReportId, reportDate),
    enabled: !!dailyReportId && !!reportDate,
    staleTime: 30 * 1000, // 30 segundos, consistente con el hook de datos
  });

  // Map de desvíos de empleados: clave compuesta employee_id:row_id
  const employeeDeviationMap = useMemo(() => {
    const map = new Map<string, EmployeeDeviation>();
    data?.employee_deviations.forEach((dev) => {
      map.set(`${dev.employee_id}:${dev.row_id}`, dev);
    });
    return map;
  }, [data?.employee_deviations]);

  // Map de desvíos de equipos: clave compuesta equipment_id:row_id
  const equipmentDeviationMap = useMemo(() => {
    const map = new Map<string, EquipmentDeviation>();
    data?.equipment_deviations.forEach((dev) => {
      map.set(`${dev.equipment_id}:${dev.row_id}`, dev);
    });
    return map;
  }, [data?.equipment_deviations]);

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
