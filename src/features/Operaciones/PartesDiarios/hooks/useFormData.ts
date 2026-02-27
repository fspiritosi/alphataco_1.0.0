'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getActiveEquipmentsForDailyReport,
  getActiveOperativeOtherEquipmentForDailyReport,
  getAllActiveEmployeesForDailyReport,
  getCustomers,
} from '../actions/actions';

/**
 * Hook para cargar los datos completos necesarios para el formulario DailyReportForm.
 * Carga todos los empleados, equipos, otros equipos operativos y clientes con useQuery.
 * Estos datos son para los dropdowns de seleccion del formulario.
 */
export function useFormData(reportDate: string) {
  const employeesQuery = useQuery({
    queryKey: ['daily-report-form-employees', reportDate],
    queryFn: () => getAllActiveEmployeesForDailyReport(reportDate),
    staleTime: 0,
  });

  const equipmentsQuery = useQuery({
    queryKey: ['daily-report-form-equipments'],
    queryFn: () => getActiveEquipmentsForDailyReport(),
    staleTime: 5 * 60 * 1000,
  });

  const otherEquipmentsQuery = useQuery({
    queryKey: ['daily-report-form-other-equipments'],
    queryFn: () => getActiveOperativeOtherEquipmentForDailyReport(),
    staleTime: 5 * 60 * 1000,
  });

  const customersQuery = useQuery({
    queryKey: ['daily-report-form-customers'],
    queryFn: () => getCustomers(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    employees: employeesQuery.data,
    equipments: equipmentsQuery.data,
    otherEquipments: otherEquipmentsQuery.data,
    customers: customersQuery.data,
    isLoading:
      employeesQuery.isLoading ||
      equipmentsQuery.isLoading ||
      otherEquipmentsQuery.isLoading ||
      customersQuery.isLoading,
  };
}
