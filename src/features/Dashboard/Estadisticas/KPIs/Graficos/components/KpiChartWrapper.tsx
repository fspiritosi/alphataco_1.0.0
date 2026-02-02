'use client';

import { useKpiMetadata } from '../hooks/useKpiMetadata';
import { KpiChart } from './KpiChart';

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

interface KpiChartWrapperProps {
  kpiCode: KpiCode;
}

export function KpiChartWrapper({ kpiCode }: KpiChartWrapperProps) {
  const { metadata, loading } = useKpiMetadata(kpiCode);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] border rounded-xl bg-card">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p>Cargando {kpiCode}...</p>
        </div>
      </div>
    );
  }

  return (
    <KpiChart
      kpiCode={kpiCode}
      kpiName={metadata.name}
      kpiDescription={metadata.description}
      expectedPercentage={metadata.number}
    />
  );
}
