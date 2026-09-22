'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getMaintenanceEmployeeSessionData,
  type MaintenanceEmployeeSessionData,
} from '../actions/employee-session.server';

const EMPTY_EMPLOYEE_DATA: MaintenanceEmployeeSessionData = {
  employeeName: null,
  employeeCuil: null,
};

/**
 * Datos del operario logueado en el flujo de mantenimiento.
 *
 * React Query sobre la server action: el `employee_id` y el legajo se resuelven en el
 * servidor, así el cliente no consulta la base ni la sesión por su cuenta.
 */
export function useEmployeeDataMaintenance() {
  const { data: employeeData = EMPTY_EMPLOYEE_DATA, isLoading } = useQuery({
    queryKey: ['maintenance-employee-session'],
    queryFn: () => getMaintenanceEmployeeSessionData(),
    staleTime: 5 * 60 * 1000,
  });

  return { employeeData, isLoading };
}
