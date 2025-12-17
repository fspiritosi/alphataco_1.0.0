'use client';

import { useQueryClient } from '@tanstack/react-query';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

/**
 * Hook para invalidar las queries de KPIs
 * Úsalo después de crear, actualizar o eliminar un KPI
 */
export function useInvalidateKpiQueries() {
  const queryClient = useQueryClient();

  /**
   * Invalida solo la query del KPI específico que fue modificado
   * Esto hace que React Query haga refetch automáticamente del gráfico correspondiente
   */
  const invalidateKpiChart = (kpiCode: KpiCode) => {
    // Invalidar todas las queries de este KPI específico (independientemente del rango de fechas)
    // refetchType: 'active' hace que se refetcheen inmediatamente las queries activas
    queryClient.invalidateQueries({
      queryKey: ['kpi-chart-data', kpiCode],
      exact: false, // Invalida todas las queries que empiecen con ['kpi-chart-data', kpiCode]
      refetchType: 'active', // Refetch inmediatamente las queries activas (componentes montados)
    });
  };

  /**
   * Invalida todas las queries de gráficos de KPIs
   * Útil cuando se crea un nuevo KPI o se necesita refrescar todos los gráficos
   */
  const invalidateAllKpiCharts = () => {
    queryClient.invalidateQueries({
      queryKey: ['kpi-chart-data'],
      refetchType: 'active', // Refetch inmediatamente las queries activas
    });
  };

  return { invalidateKpiChart, invalidateAllKpiCharts };
}
