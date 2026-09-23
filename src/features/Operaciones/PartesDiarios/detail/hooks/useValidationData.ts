'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getDailyReportDeviations,
  type EmployeeDeviation,
  type EquipmentDeviation,
} from '../../actions/validation.server';

export const VALIDATION_QUERY_KEY = ['daily-report-deviations'] as const;

/**
 * Clave del índice de desvíos. Los dos componentes son UUIDs no nulos (los nulos se descartan
 * al armar el mapa), así que `:` no puede aparecer dentro de ninguno y la clave es unívoca.
 */
function deviationKey(resourceId: string, rowId: string): string {
  return `${resourceId}:${rowId}`;
}

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
        // `employee_id` es nullable: con el template literal, TODOS los desvíos sin empleado de
        // una misma fila caían en la clave `"null:<row_id>"` y se pisaban entre sí. Además esa
        // entrada es inalcanzable, porque `getEmployeeDeviation` recibe un id no nulo.
        if (dev.employee_id == null) continue;
        map.set(deviationKey(dev.employee_id, row.row_id), dev);
      }
    }
    return map;
  }, [data?.rows_with_deviations]);

  const equipmentDeviationMap = useMemo(() => {
    const map = new Map<string, EquipmentDeviation>();
    if (!data?.rows_with_deviations) return map;
    for (const row of data.rows_with_deviations) {
      for (const dev of row.equipment_deviations) {
        // Mismo caso: `equipment_id` es el `COALESCE(equipment_id, other_equipment_id)` del SQL
        // y puede venir null.
        if (dev.equipment_id == null) continue;
        map.set(deviationKey(dev.equipment_id, row.row_id), dev);
      }
    }
    return map;
  }, [data?.rows_with_deviations]);

  const getEmployeeDeviation = (employeeId: string, rowId: string): EmployeeDeviation | null => {
    return employeeDeviationMap.get(deviationKey(employeeId, rowId)) ?? null;
  };

  const getEquipmentDeviation = (equipmentId: string, rowId: string): EquipmentDeviation | null => {
    return equipmentDeviationMap.get(deviationKey(equipmentId, rowId)) ?? null;
  };

  return {
    isLoading,
    getEmployeeDeviation,
    getEquipmentDeviation,
  };
}
