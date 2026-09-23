'use client';

import { useQuery } from '@tanstack/react-query';
import { getDailyIndicators, type DailyIndicatorPoint, type IndicatorFunction } from '../actions/getChartData';

export type { IndicatorFunction };

const EMPTY: DailyIndicatorPoint[] = [];

/**
 * Serie histórica de un indicador diario.
 *
 * Usa React Query (antes era `useEffect` + `useState`, contra la regla del repo) y el tipo
 * viene de la action, no de un `any[]`.
 */
export function useChartData(source: IndicatorFunction) {
  const { data, isLoading } = useQuery({
    queryKey: ['daily-indicators', source],
    queryFn: () => getDailyIndicators(source),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return { data: data ?? EMPTY, loading: isLoading };
}
