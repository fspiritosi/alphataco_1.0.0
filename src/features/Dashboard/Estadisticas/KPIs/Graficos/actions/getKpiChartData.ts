'use server';

import { supabaseServer } from '@/lib/supabase/server';
import moment from 'moment';
import { cookies } from 'next/headers';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

export async function getKpiChartData(kpiCode: KpiCode, fromDate: Date, toDate: Date) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  // Usar moment para formatear fechas (formato YYYY-MM-DD que espera PostgreSQL)
  const fromDateStr = moment(fromDate).format('YYYY-MM-DD');
  const toDateStr = moment(toDate).format('YYYY-MM-DD');

  // UNA SOLA LLAMADA RPC para todo el rango de fechas
  const { data, error } = await supabase.rpc('get_kpi_range', {
    p_kpi_code: kpiCode,
    p_company_id: company_id,
    p_from_date: fromDateStr,
    p_to_date: toDateStr,
  });

  if (error) {
    console.error(`Error calling get_kpi_range for ${kpiCode}:`, error);
    return [];
  }

  if (!data || !Array.isArray(data)) {
    console.warn(`No data returned from get_kpi_range for ${kpiCode}`);
    return [];
  }

  // Transformar los resultados al formato esperado por el frontend
  const results = data.map((row: { snapshot_date: string; indicator: number; raw_data: any }) => ({
    snapshot_date: row.snapshot_date,
    metrics: {
      indicator: row.indicator ?? 0,
    },
    created_at: new Date().toISOString(),
  }));

  // Ordenar por fecha
  const sortedResults = results.sort((a, b) => (a.snapshot_date > b.snapshot_date ? 1 : -1));

  return sortedResults;
}

export async function getKpiNumber(kpiCode: KpiCode): Promise<number | null> {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    return null;
  }

  const { data, error } = await supabase
    .from('kpis')
    .select('number')
    .eq('company_id', company_id)
    .eq('code', kpiCode)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error(`Error fetching KPI number for ${kpiCode}:`, error);
    return null;
  }

  return data.number ? Number(data.number) : null;
}

export async function getKpiName(kpiCode: KpiCode): Promise<string | null> {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    return null;
  }

  const { data, error } = await supabase
    .from('kpis')
    .select('name')
    .eq('company_id', company_id)
    .eq('code', kpiCode)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error(`Error fetching KPI name for ${kpiCode}:`, error);
    return null;
  }

  return data.name || null;
}

// Mapeo de descripciones cortas para cada KPI
const KPI_DESCRIPTION_MAP: Record<KpiCode, string> = {
  'KPI-0001': 'Porcentaje de empleados ausentes sobre el total de empleados activos (AD = TA / TE × 100)',
  'KPI-0002':
    'Porcentaje de personal asignado a movimientos internos sobre el total de personal apto (PMI = TMI / TPA × 100)',
  'KPI-0003':
    'Porcentaje de personal productivo asignado a clientes sobre el personal disponible (PP = TPC / (TPA - TMI) × 100)',
  'KPI-0004': 'Porcentaje de equipos no operativos sobre el total de equipos aptos (EDO = ENO / EA × 100)',
  'KPI-0005':
    'Porcentaje de equipos asignados a movimientos internos sobre equipos operativos (EMI = EAMI / EOA × 100)',
  'KPI-0006':
    'Porcentaje de equipos operativos asignados a clientes sobre equipos disponibles (EOC = TEOC / TEOA × 100)',
};

export async function getKpiDescription(kpiCode: KpiCode): Promise<string> {
  // Retornar descripción del mapeo
  return KPI_DESCRIPTION_MAP[kpiCode] || 'Evolución del indicador';
}
