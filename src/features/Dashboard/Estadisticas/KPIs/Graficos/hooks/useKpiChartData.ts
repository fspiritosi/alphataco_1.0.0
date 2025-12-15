'use client';

import { useQuery } from '@tanstack/react-query';
import { getKpiChartData } from '../actions/getKpiChartData';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

export function useKpiChartData(kpiCode: KpiCode, fromDate: Date, toDate: Date, initialData?: any[]) {
  const fromStr = fromDate.toISOString().split('T')[0];
  const toStr = toDate.toISOString().split('T')[0];

  // DEBUG HOOK: Ver qué initialData llega al hook
  if (kpiCode === 'KPI-0006') {
    const item25Nov = initialData?.find((i: any) => i.snapshot_date === '2025-11-25');
    console.log(`[EOC TRACE HOOK] initialData recibido:`, item25Nov?.metrics?.indicator);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['kpi-chart-data', kpiCode, fromStr, toStr],
    queryFn: () => getKpiChartData(kpiCode, fromDate, toDate),
    initialData: initialData,
    placeholderData: initialData, // Usar como placeholder mientras carga
    staleTime: 0, // Los datos siempre se consideran stale para que se refresquen cuando se invaliden
    gcTime: 0, // Sin caché - los datos se eliminan inmediatamente cuando no están en uso
    refetchOnMount: true, // Refetch cuando el componente se monta si los datos están stale
    refetchOnWindowFocus: true, // Refetch al cambiar de ventana para obtener datos frescos
    refetchOnReconnect: true, // Refetch al reconectar
  });

  // DEBUG HOOK: Ver qué data devuelve React Query
  if (kpiCode === 'KPI-0006') {
    const item25Nov = data?.find((i: any) => i.snapshot_date === '2025-11-25');
    console.log(`[EOC TRACE HOOK] data de React Query:`, item25Nov?.metrics?.indicator);
  }

  return {
    data: data || [],
    loading: isLoading,
  };
}
