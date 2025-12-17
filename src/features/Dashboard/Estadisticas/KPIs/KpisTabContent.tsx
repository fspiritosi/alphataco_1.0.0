import { TabsManagerServer } from '@/features/TabsManager';
import { BarChart3, ClipboardList } from 'lucide-react';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import GraficosTabContent from './Graficos/GraficosTabContent';
import { KpisTabClient } from './KpisTabClient';
import { fetchAllKPIs } from './actions/actions';

export default async function KpisTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  const kpis = fetchAllKPIs();
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get('kpis-table')?.value;
  const savedFilter = cookiesStore.get('kpis-table-filters')?.value;

  return (
    <TabsManagerServer
      paramName="subtab"
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
            <Suspense fallback={<div>Cargando indicadores...</div>}>
              <KpisTabClient
                kpis={kpis}
                savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
                savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
              />
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
            <Suspense fallback={<div>Cargando gráficos...</div>}>
              <GraficosTabContent />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
