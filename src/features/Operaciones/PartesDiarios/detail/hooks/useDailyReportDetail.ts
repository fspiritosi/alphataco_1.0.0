'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const DAILY_REPORT_DETAIL_QUERY_KEY = ['daily-report-detail'] as const;

export function useDailyReportDetailInvalidation() {
  const queryClient = useQueryClient();

  const invalidateDetail = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [...DAILY_REPORT_DETAIL_QUERY_KEY] });
  }, [queryClient]);

  return { invalidateDetail };
}
