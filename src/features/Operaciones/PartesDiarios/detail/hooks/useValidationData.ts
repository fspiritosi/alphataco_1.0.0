'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getDailyReportDeviations,
  type EmployeeDeviation,
  type EquipmentDeviation,
} from '../../actions/validation.server';

export const VALIDATION_QUERY_KEY = ['daily-report-deviations'] as const;

export function useValidationData(dailyReportId: string, reportDate: string) {
  const { data, isLoading } = useQuery({
    queryKey: [...VALIDATION_QUERY_KEY, dailyReportId, reportDate],
    queryFn: () => getDailyReportDeviations(dailyReportId, reportDate),
    enabled: !!dailyReportId && !!reportDate,
    staleTime: 30 * 1000,
  });

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

  const getEmployeeDeviation = (employeeId: string, rowId: string): EmployeeDeviation | null => {
    return employeeDeviationMap.get(`${employeeId}:${rowId}`) ?? null;
  };

  const getEquipmentDeviation = (equipmentId: string, rowId: string): EquipmentDeviation | null => {
    return equipmentDeviationMap.get(`${equipmentId}:${rowId}`) ?? null;
  };

  return {
    isLoading,
    getEmployeeDeviation,
    getEquipmentDeviation,
  };
}
