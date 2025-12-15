'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

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

export async function getDailyIndicators(source: IndicatorFunction) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  const { data: allData, error: allDataError } = await supabase
    .from('daily_indicators')
    .select('snapshot_date, metrics, created_at')
    .eq('company_id', company_id)
    .eq('source', source)
    .order('snapshot_date', { ascending: true });

  if (allDataError) {
    return [];
  }

  if (!allData || allData.length === 0) {
    return [];
  }

  return allData;
}
