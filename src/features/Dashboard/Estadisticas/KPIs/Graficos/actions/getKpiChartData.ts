'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import moment from 'moment';
import { cookies } from 'next/headers';

const logger = new Logger('features/Dashboard/KPIs/Graficos');

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

export async function getKpiChartData(kpiCode: KpiCode, fromDate: Date, toDate: Date) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  const fromDateStr = moment(fromDate).format('YYYY-MM-DD');
  const toDateStr = moment(toDate).format('YYYY-MM-DD');

  const { data, error } = await supabase.rpc('get_kpi_range', {
    p_kpi_code: kpiCode,
    p_company_id: company_id,
    p_from_date: fromDateStr,
    p_to_date: toDateStr,
  });

  if (error) {
    logger.error(`Error calling get_kpi_range for ${kpiCode}`, { data: { error } });
    return [];
  }

  if (!data || !Array.isArray(data)) {
    logger.warn(`No data returned from get_kpi_range for ${kpiCode}`);
    return [];
  }

  const results = data.map((row) => ({
    snapshot_date: row.snapshot_date,
    metrics: {
      indicator: row.indicator ?? 0,
    },
    created_at: new Date().toISOString(),
  }));

  return results.sort((a, b) => (a.snapshot_date > b.snapshot_date ? 1 : -1));
}
