'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getKpiDescription, getKpiName, getKpiNumber } from '../actions/getKpiChartData';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

interface KpiMetadata {
  name: string;
  number: number;
  description: string;
}

export function useKpiMetadata(kpiCode: KpiCode) {
  const { data, isLoading } = useQuery({
    queryKey: ['kpi-metadata', kpiCode],
    queryFn: async (): Promise<KpiMetadata> => {
      const [name, number, description] = await Promise.all([
        getKpiName(kpiCode),
        getKpiNumber(kpiCode),
        getKpiDescription(kpiCode),
      ]);
      return {
        name: name || kpiCode,
        number: number || 0,
        description: description,
      };
    },
    staleTime: 0, // Siempre refetch cuando se monta
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    metadata: data || { name: kpiCode, number: 0, description: '' },
    loading: isLoading,
  };
}

// Hook para invalidar el caché de metadatos de KPIs
export function useInvalidateKpiMetadata() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['kpi-metadata'] });
  };
}
