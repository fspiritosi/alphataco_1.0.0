'use client';

import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { getKpiChartData } from '../actions/getKpiChartData';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

export function useKpiChartData(kpiCode: KpiCode, fromDate: Date, toDate: Date) {
  const fromStr = moment(fromDate).format('YYYY-MM-DD');
  const toStr = moment(toDate).format('YYYY-MM-DD');

  const { data, isLoading } = useQuery({
    queryKey: ['kpi-chart-data', kpiCode, fromStr, toStr],
    queryFn: () => getKpiChartData(kpiCode, fromDate, toDate),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    data: data || [],
    loading: isLoading, // Solo isLoading — isFetching causa flash en background refetch
  };
}
