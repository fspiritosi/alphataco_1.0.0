import { getKpiChartData, getKpiDescription, getKpiName, getKpiNumber } from '../actions/getKpiChartData';
import { KpiChart } from './KpiChart';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

interface KpiChartWrapperProps {
  kpiCode: KpiCode;
}

export async function KpiChartWrapper({ kpiCode }: KpiChartWrapperProps) {
  // Obtener datos iniciales del servidor
  const today = new Date();
  const fromDate = new Date();
  fromDate.setDate(today.getDate() - 30); // Últimos 30 días por defecto

  const [kpiName, kpiNumber, kpiDescription, initialData] = await Promise.all([
    getKpiName(kpiCode),
    getKpiNumber(kpiCode),
    getKpiDescription(kpiCode),
    getKpiChartData(kpiCode, fromDate, today),
  ]);

  return (
    <KpiChart
      kpiCode={kpiCode}
      kpiName={kpiName || kpiCode}
      kpiDescription={kpiDescription}
      expectedPercentage={kpiNumber || 0}
      initialData={initialData || []}
      initialFromDate={fromDate}
      initialToDate={today}
    />
  );
}
