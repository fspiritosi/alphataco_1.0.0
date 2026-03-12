import { TabsManagerServer } from '@/features/TabsManager';
import { BarChart3, ClipboardList } from 'lucide-react';
import { Suspense } from 'react';
import GraficosTabContent from './Graficos/GraficosTabContent';
import { KpisIndicadoresSkeleton } from './Indicadores/fallback/KpisIndicadoresSkeleton';
import KpisIndicadoresContent from './KpisIndicadoresContent';

export default async function KpisTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <TabsManagerServer
      paramName="kpiview"
      searchParams={searchParams}
      defaultTab="indicadores"
      permissions={permissions}
      tabs={[
        {
          value: 'indicadores',
          label: (
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Indicadores
            </span>
          ),
          moduleSlug: 'dashboard',
          tabSlug: 'indicadores',
          content: (
            <Suspense fallback={<KpisIndicadoresSkeleton />}>
              <KpisIndicadoresContent searchParams={searchParams} />
            </Suspense>
          ),
        },
        {
          value: 'graficos',
          label: (
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Gráficos
            </span>
          ),
          moduleSlug: 'dashboard',
          tabSlug: 'graficos',
          content: (
            <Suspense fallback={<div className="h-[300px] w-full animate-pulse bg-muted rounded-md" />}>
              <GraficosTabContent />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
