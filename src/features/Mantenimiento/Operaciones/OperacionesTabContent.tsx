import { TabsManagerServer } from '@/features/TabsManager';
import { Clock, Eye, Warehouse } from 'lucide-react';
import { Suspense } from 'react';
import { ParaTallerTableClient } from './ParaTaller/components/ParaTallerTableClient';
import { getMaintenanceOperations, getOrdersForWorkshop } from './actions/queries.server';
import { OperacionesPlanificadasTableClient } from './components/OperacionesPlanificadasTableClient';
import { OperacionesTableClient } from './components/OperacionesTableClient';
import { OperacionesTableSkeleton } from './fallback';

interface OperacionesTabContentProps {
  searchParams?: { [key: string]: string | string[] | undefined };
  permissions?: Record<string, boolean>;
}

export async function OperacionesTabContent({ searchParams, permissions }: OperacionesTabContentProps) {
  // Fetching en el servidor
  const [initialData, ordersForWorkshop] = await Promise.all([getMaintenanceOperations(), getOrdersForWorkshop()]);

  const tabs = [
    {
      value: 'operations_pending',
      label: (
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pendientes de Ejecutar
        </span>
      ),
      moduleSlug: 'mantenimiento' as const,
      tabSlug: 'pendientes_ejecutar' as const,
      content: (
        <Suspense fallback={<OperacionesTableSkeleton />}>
          <OperacionesTableClient initialData={initialData} />
        </Suspense>
      ),
    },
    {
      value: 'operations_planned',
      label: (
        <span className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Planificadas (Vista)
        </span>
      ),
      moduleSlug: 'mantenimiento' as const,
      tabSlug: 'maintenance_orders' as const,
      content: (
        <Suspense fallback={<OperacionesTableSkeleton />}>
          <OperacionesPlanificadasTableClient initialData={initialData} />
        </Suspense>
      ),
    },
    {
      value: 'operations_for_workshop',
      label: (
        <span className="flex items-center gap-2">
          <Warehouse className="h-4 w-4" />
          Para Taller
        </span>
      ),
      moduleSlug: 'mantenimiento' as const,
      tabSlug: 'para_taller' as const,
      content: (
        <Suspense fallback={<OperacionesTableSkeleton />}>
          <ParaTallerTableClient initialData={ordersForWorkshop} />
        </Suspense>
      ),
    },
  ];

  return (
    <TabsManagerServer
      paramName="operations_tab"
      searchParams={searchParams || {}}
      defaultTab="operations_pending"
      permissions={permissions || {}}
      tabs={tabs}
    />
  );
}
