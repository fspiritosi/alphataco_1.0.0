'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

// Mapeo de códigos de KPI a funciones SQL
const KPI_FUNCTION_MAP: Record<KpiCode, string> = {
  'KPI-0001': 'ad_ausentismo_diario',
  'KPI-0002': 'pmi_personal_mi',
  'KPI-0003': 'pp_productividad_personal',
  'KPI-0004': 'edo_disponibilidad_operacional_mantenimiento',
  'KPI-0005': 'emi_disponibilidad_operacional_mi',
  'KPI-0006': 'eoc_disponibilidad_operacional_cliente',
};

// Mapeo de códigos de KPI a campos del resultado JSON
const KPI_VALUE_FIELD_MAP: Record<KpiCode, string> = {
  'KPI-0001': 'AD',
  'KPI-0002': 'PMI',
  'KPI-0003': 'PP',
  'KPI-0004': 'EDO',
  'KPI-0005': 'EMI',
  'KPI-0006': 'EOC',
};

export async function getKpiChartData(kpiCode: KpiCode, fromDate: Date, toDate: Date) {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    return [];
  }

  const functionName = KPI_FUNCTION_MAP[kpiCode];
  const valueField = KPI_VALUE_FIELD_MAP[kpiCode];

  if (!functionName) {
    console.error(`No function mapped for KPI code: ${kpiCode}`);
    return [];
  }

  // Función helper para formatear fecha local sin problemas de timezone
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generar array de fechas entre fromDate y toDate
  const dates: Date[] = [];
  const currentDate = new Date(fromDate);
  while (currentDate <= toDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Ejecutar la función SQL para cada fecha
  const results = await Promise.all(
    dates.map(async (date) => {
      const dateStr = formatDateLocal(date);
      const { data, error } = await supabase.rpc(functionName as any, {
        p_company_id: company_id,
        p_date: dateStr,
      });

      if (error) {
        console.error(`Error calling ${functionName} for date ${dateStr}:`, error);
        return {
          snapshot_date: dateStr,
          metrics: {
            indicator: 0,
          },
          created_at: new Date().toISOString(),
        };
      }

      if (!data) {
        console.warn(`No data returned from ${functionName} for date ${dateStr}`);
        return {
          snapshot_date: dateStr,
          metrics: {
            indicator: 0,
          },
          created_at: new Date().toISOString(),
        };
      }

      // Las funciones devuelven un objeto JSON directamente
      // Ejemplo: { "date": "2025-12-15", "TE": 9, "TA": 9, "AD": 100 }
      // O puede estar envuelto: { "ad_ausentismo_diario": { "date": "...", "AD": 100, ... } }
      let kpiData: any = data;

      // Si data es un objeto con el nombre de la función como clave (cuando Supabase envuelve el resultado)
      if (typeof data === 'object' && data !== null && functionName in data) {
        kpiData = (data as any)[functionName];
      }

      // Si kpiData es un array, tomar el primer elemento (algunas funciones devuelven arrays)
      if (Array.isArray(kpiData) && kpiData.length > 0) {
        kpiData = kpiData[0];
      }

      // Extraer el valor del campo correspondiente del JSON
      const value = kpiData?.[valueField];

      // Convertir a número y asegurar que sea un valor válido
      let indicatorValue = 0;
      if (value !== undefined && value !== null) {
        const numValue = Number(value);
        if (!isNaN(numValue) && isFinite(numValue)) {
          indicatorValue = numValue;
        }
      }

      const result = {
        snapshot_date: dateStr,
        metrics: {
          indicator: indicatorValue,
        },
        created_at: new Date().toISOString(),
      };

      // DEBUG KPI-0006: Rastreo del flujo de datos para 25/11/2025
      if (kpiCode === 'KPI-0006' && dateStr === '2025-11-25') {
        console.log(`[EOC DEBUG 25/11] Flujo completo:`, {
          paso1_respuestaSQL: JSON.stringify(data),
          paso2_kpiDataProcesado: JSON.stringify(kpiData),
          paso3_valorExtraido: value,
          paso4_indicadorFinal: indicatorValue,
        });
      }

      return result;
    })
  );

  // Filtrar resultados nulos y ordenar por fecha
  const filteredResults = results.filter((r) => r !== null) as Array<{
    snapshot_date: string;
    metrics: { indicator: number };
    created_at: string;
  }>;

  const sortedResults = filteredResults.sort((a, b) => (a.snapshot_date > b.snapshot_date ? 1 : -1));

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
