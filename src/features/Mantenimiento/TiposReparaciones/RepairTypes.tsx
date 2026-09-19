import { Skeleton } from '@/components/ui/skeleton';
import { EquiposConDesviosTabContent } from '@/features/Mantenimiento/EquiposConDesvios';
import { EquipmentsWithDeviationsSkeleton } from '@/features/Mantenimiento/EquiposConDesvios/fallback';
import { OperacionesTabContent } from '@/features/Mantenimiento/Operaciones';
import { OperacionesTableSkeleton } from '@/features/Mantenimiento/Operaciones/fallback';
import { PedidosMantenimientoTabContent } from '@/features/Mantenimiento/PedidosMantenimiento';
import { PedidosTableSkeleton } from '@/features/Mantenimiento/PedidosMantenimiento/fallback';
import { SolicitudesMantenimientoTabContent } from '@/features/Mantenimiento/SolicitudesMantenimiento';
import { SolicitudesTableSkeleton } from '@/features/Mantenimiento/SolicitudesMantenimiento/fallback';
import { TabsManagerServer } from '@/features/TabsManager';
import { AlertTriangle, Calendar, ClipboardCheck, Settings, Users, Wrench } from 'lucide-react';
import { Suspense } from 'react';
import MaintenanceGroupsWrapper from './MaintenanceGroupsWrapper';
import RepairTypeFormWrapper from './RepairTypeFormWrapper';

export default async function RepairTypes({
  searchParams,
  hiddenTabs,
  moduleSlug = 'equipos',
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  hiddenTabs?: string[];
  moduleSlug?: 'equipos' | 'mantenimiento';
  permissions: Record<string, boolean>;
}) {
  const allTabs = [
    {
      value: 'equipments_with_deviations',
      label: (
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Equipos con Desvíos
        </span>
      ),
      moduleSlug: moduleSlug,
      tabSlug: 'equipments_with_deviations' as const,
      content: (
        <Suspense fallback={<EquipmentsWithDeviationsSkeleton />}>
          <EquiposConDesviosTabContent searchParams={searchParams} />
        </Suspense>
      ),
    },
    {
      value: 'type_of_repair',
      label: (
        <span className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Tipos de Reparación
        </span>
      ),
      moduleSlug: moduleSlug,
      tabSlug: 'type_of_repair' as const,
      content: (
        <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
          <RepairTypeFormWrapper />
        </Suspense>
      ),
    },
    {
      value: 'maintenance_groups',
      label: (
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Grupos
        </span>
      ),
      moduleSlug: moduleSlug,
      tabSlug: 'maintenance_groups' as const,
      content: (
        <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
          <MaintenanceGroupsWrapper />
        </Suspense>
      ),
    },
    // Nuevas tabs del flujo de mantenimiento con aprobaciones
    {
      value: 'maintenance_requests',
      label: (
        <span className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Solicitudes de Mantenimiento
        </span>
      ),
      moduleSlug: 'mantenimiento' as const,
      tabSlug: 'maintenance_requests' as const,
      content: (
        <Suspense fallback={<SolicitudesTableSkeleton />}>
          <SolicitudesMantenimientoTabContent />
        </Suspense>
      ),
    },
    {
      value: 'maintenance_orders',
      label: (
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Pedidos de Mantenimiento
        </span>
      ),
      moduleSlug: 'mantenimiento' as const,
      tabSlug: 'maintenance_orders' as const,
      content: (
        <Suspense fallback={<PedidosTableSkeleton />}>
          <PedidosMantenimientoTabContent />
        </Suspense>
      ),
    },
    {
      value: 'maintenance_operations',
      label: (
        <span className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Operaciones
        </span>
      ),
      moduleSlug: 'mantenimiento' as const,
      tabSlug: 'maint_operaciones' as const,
      content: (
        <Suspense fallback={<OperacionesTableSkeleton />}>
          <OperacionesTabContent searchParams={searchParams} permissions={permissions} />
        </Suspense>
      ),
    },
  ];

  const filteredTabs = hiddenTabs ? allTabs.filter((tab) => !hiddenTabs.includes(tab.value)) : allTabs;

  return (
    <TabsManagerServer
      paramName="subtab"
      searchParams={searchParams}
      defaultTab="equipments_with_deviations"
      permissions={permissions}
      tabs={filteredTabs}
    />
  );
}
