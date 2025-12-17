'use client';

import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { getKpiChartData } from '../actions/getKpiChartData';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

export function useKpiChartData(kpiCode: KpiCode, fromDate: Date, toDate: Date) {
  // Usar moment para formatear fechas consistentemente (formato YYYY-MM-DD)
  const fromStr = moment(fromDate).format('YYYY-MM-DD');
  const toStr = moment(toDate).format('YYYY-MM-DD');

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['kpi-chart-data', kpiCode, fromStr, toStr],
    queryFn: () => getKpiChartData(kpiCode, fromDate, toDate),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    data: data || [],
    loading: isLoading || isFetching,
  };
}
