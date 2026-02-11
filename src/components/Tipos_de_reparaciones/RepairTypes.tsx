import { EquiposConDesviosTabContent } from '@/features/Mantenimiento/EquiposConDesvios';
import { EquipmentsWithDeviationsSkeleton } from '@/features/Mantenimiento/EquiposConDesvios/fallback';
import { OperacionesTabContent } from '@/features/Mantenimiento/Operaciones';
import { OperacionesTableSkeleton } from '@/features/Mantenimiento/Operaciones/fallback';
import { PedidosMantenimientoTabContent } from '@/features/Mantenimiento/PedidosMantenimiento';
import { PedidosTableSkeleton } from '@/features/Mantenimiento/PedidosMantenimiento/fallback';
import { SolicitudesMantenimientoTabContent } from '@/features/Mantenimiento/SolicitudesMantenimiento';
import { SolicitudesTableSkeleton } from '@/features/Mantenimiento/SolicitudesMantenimiento/fallback';
import { TabsManagerServer } from '@/features/TabsManager';
import { AlertTriangle, Calendar, ClipboardCheck, ClipboardList, Plus, Settings, Users, Wrench } from 'lucide-react';
import { Suspense } from 'react';
import MaintenanceGroupsWrapper from './MaintenanceGroupsWrapper';
import RepairEntryWrapper from './RepairEntryWrapper';
import RepairSolicitudesWrapper from './RepairSolicitudesWrapper';
import RepairTypeFormWrapper from './RepairTypeFormWrapper';

export default async function RepairTypes({
  mechanic,
  equipment_id,
  searchParams,
  hiddenTabs,
  moduleSlug = 'equipos',
  permissions,
}: {
  mechanic?: boolean;
  equipment_id?: string;
  searchParams: { [key: string]: string | string[] | undefined };
  hiddenTabs?: string[];
  moduleSlug?: 'equipos' | 'mantenimiento';
  permissions: Record<string, boolean>;
}) {
  const allTabs = [
    {
      value: 'created_solicitudes',
      label: (
        <span className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          {mechanic ? 'Solicitudes Activas' : 'Solicitudes'}
        </span>
      ),
      moduleSlug: moduleSlug,
      tabSlug: 'created_solicitudes' as const,
      content: (
        <Suspense fallback={<div>Cargando solicitudes...</div>}>
          <RepairSolicitudesWrapper mechanic={mechanic} equipment_id={equipment_id} />
        </Suspense>
      ),
    },
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
          <EquiposConDesviosTabContent />
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
        <Suspense fallback={<div>Cargando tipos de reparación...</div>}>
          <RepairTypeFormWrapper />
        </Suspense>
      ),
    },
    {
      value: 'type_of_repair_new_entry',
      label: (
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Solicitud
        </span>
      ),
      moduleSlug: moduleSlug,
      tabSlug: 'type_of_repair_new_entry' as const,
      content: (
        <Suspense fallback={<div>Cargando formulario...</div>}>
          <RepairEntryWrapper equipment_id={equipment_id} searchParams={searchParams} permissions={permissions} />
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
        <Suspense fallback={<div>Cargando grupos...</div>}>
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
      defaultTab="created_solicitudes"
      permissions={permissions}
      tabs={filteredTabs}
    />
  );
}
