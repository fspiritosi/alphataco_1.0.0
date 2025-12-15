import { KpiChartWrapper } from './components/KpiChartWrapper';

export default function GraficosTabContent() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <KpiChartWrapper kpiCode="KPI-0001" />
        <KpiChartWrapper kpiCode="KPI-0002" />
        <KpiChartWrapper kpiCode="KPI-0003" />
        <KpiChartWrapper kpiCode="KPI-0004" />
        <KpiChartWrapper kpiCode="KPI-0005" />
        <KpiChartWrapper kpiCode="KPI-0006" />
      </div>
    </div>
  );
}
