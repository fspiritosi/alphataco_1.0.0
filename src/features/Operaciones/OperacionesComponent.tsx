import { getUserPermissionsMapServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { ClipboardList, Package } from 'lucide-react';
import { Suspense } from 'react';
import PartesDiariosTabContent from './PartesDiarios/PartesDiariosTabContent';
import { DailyReportTableSkeleton } from './PartesDiarios/list/fallback/DailyReportTableSkeleton';
import PreparteTabContent from './Preparte/PreparteTabContent';
import { PreparteSkeleton } from './Preparte/fallback/PreparteSkeleton';

export default async function OperacionesComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Obtener permisos (usará cache pre-cargado en layout, sin query adicional)
  const permissions = await getUserPermissionsMapServer();

  return (
    <div>
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="preparte"
        permissions={permissions}
        tabs={[
          {
            value: 'preparte',
            label: (
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Gestor de Pedidos
              </span>
            ),
            moduleSlug: 'operaciones',
            tabSlug: 'preparte',
            content: (
              <Suspense fallback={<PreparteSkeleton />}>
                <PreparteTabContent />
              </Suspense>
            ),
          },
          {
            value: 'dailyreportstable',
            label: (
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Partes Diarios
              </span>
            ),
            moduleSlug: 'operaciones',
            tabSlug: 'dailyreportstable',
            content: (
              <Suspense fallback={<DailyReportTableSkeleton />}>
                <PartesDiariosTabContent searchParams={searchParams} />
              </Suspense>
              
            ),
          },
        ]}
      />
    </div>
  );
}
