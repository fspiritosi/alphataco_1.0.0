'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDailyReportsWithFilters } from '../actions/queries.server';

export const DAILY_REPORTS_QUERY_KEY = ['daily-reports'] as const;

export type DailyReportType = Awaited<ReturnType<typeof fetchDailyReportsWithFilters>>[number];

interface UseDailyReportsParams {
  fromDate: string | undefined;
  toDate: string | undefined;
  initialData?: Awaited<ReturnType<typeof fetchDailyReportsWithFilters>>;
}

export function useDailyReports({ fromDate, toDate, initialData }: UseDailyReportsParams) {
  return useQuery({
    queryKey: [...DAILY_REPORTS_QUERY_KEY, { fromDate, toDate }],
    queryFn: () => fetchDailyReportsWithFilters({ fromDate, toDate }),
    placeholderData: (previousData) => previousData ?? initialData,
    staleTime: 2 * 60 * 1000,
  });
}
