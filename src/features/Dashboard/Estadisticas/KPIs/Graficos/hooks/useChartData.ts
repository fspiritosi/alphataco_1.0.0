'use client';

import { useEffect, useState } from 'react';
import { getDailyIndicators } from '../actions/getChartData';

type IndicatorFunction =
  | 'get_employee_usage_indicator'
  | 'get_vehicle_usage_indicator'
  | 'hr_get_absenteeism_summary'
  | 'hr_get_absenteeism_trend'
  | 'hr_get_daily_absence_timeseries'
  | 'get_company_counts_indicator'
  | 'get_employee_diagram_count_by_day'
  | 'hr_get_current_absent_employees'
  | 'hr_get_department_absence_reasons'
  | 'hr_get_department_absence_summary';

export function useChartData(source: IndicatorFunction) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const result = await getDailyIndicators(source);
        setData(result || []);
      } catch (error) {
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [source]);

  return { data, loading };
}
