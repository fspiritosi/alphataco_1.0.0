import { getKpiDescription, getKpiName, getKpiNumber } from '../actions/getKpiChartData';
import { KpiChart } from './KpiChart';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

interface KpiChartWrapperProps {
  kpiCode: KpiCode;
}

export async function KpiChartWrapper({ kpiCode }: KpiChartWrapperProps) {
  // Solo obtener metadatos del servidor, los datos se cargan en el cliente
  const [kpiName, kpiNumber, kpiDescription] = await Promise.all([
    getKpiName(kpiCode),
    getKpiNumber(kpiCode),
    getKpiDescription(kpiCode),
  ]);

  return (
    <KpiChart
      kpiCode={kpiCode}
      kpiName={kpiName || kpiCode}
      kpiDescription={kpiDescription}
      expectedPercentage={kpiNumber || 0}
    />
  );
}
