import { TabsManagerServer } from '@/features/TabsManager';
import { ClipboardList, Package } from 'lucide-react';
import { Suspense } from 'react';
import PartesDiariosTabContent from './PartesDiarios/PartesDiariosTabContent';
import PreparteTabContent from './Preparte/PreparteTabContent';

export default function OperacionesComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div>
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="preparte"
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
              <Suspense fallback={<div>Cargando pedidos...</div>}>
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
              <Suspense fallback={<div>Cargando partes diarios...</div>}>
                <PartesDiariosTabContent />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
