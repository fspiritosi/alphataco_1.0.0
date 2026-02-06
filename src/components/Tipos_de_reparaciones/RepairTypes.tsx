import { TabsManagerServer } from '@/features/TabsManager';
import { ClipboardList, Plus, Settings, Users } from 'lucide-react';
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
