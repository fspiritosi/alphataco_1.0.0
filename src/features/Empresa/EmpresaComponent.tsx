import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import TiposDocumentosTabContent from '@/features/Documentacion/TiposDocumentos/TiposDocumentosTabContent';
import MaintenanceGroupsWrapper from '@/features/Mantenimiento/TiposReparaciones/MaintenanceGroupsWrapper';
import RepairTypeFormWrapper from '@/features/Mantenimiento/TiposReparaciones/RepairTypeFormWrapper';
import { getUserPermissionsMapServer } from '@/features/Permissions';
import { SectionManagerServer, TabsManagerServer } from '@/features/TabsManager';
import { Building2, FileType, Layers, Settings, Truck, Users, Wrench } from 'lucide-react';
import { Suspense } from 'react';
import EquipmentsTabContent from './Equipos/EquipmentsTabContent';
import SectoresTab from './General/components/mantenimiento/SectoresTab';
import TalleresTab from './General/components/mantenimiento/TalleresTab';
import GeneralTabContent from './General/GeneralTabContent';
import RrhhTabContent from './RRHH/RrhhTabContent';

/**
 * Módulo Configuración (antes "Empresa").
 *
 * Concentra todo lo que se configura una vez y se usa en el resto del sistema. Tres de sus
 * secciones llegaron desde otros módulos, donde estaban mezcladas con el trabajo del día a día:
 *
 * - **Mantenimiento** junta cuatro pantallas que estaban en dos lugares distintos: talleres y
 *   sectores eran una subtab de General, y tipos de reparación y grupos eran la tab
 *   Configuración del módulo Mantenimiento. Configurar un taller y configurar las reparaciones
 *   que hace ese taller es lo mismo, así que van en una sola vista.
 * - **Documentos** (tipos de documento) era la tab Tipos de Documentos del módulo Documentación.
 * - **General** sumó los KPIs, que estaban en Dashboard > Estadísticas: definir qué se mide es
 *   configuración; el Dashboard sólo lo muestra.
 *
 * Los `tabId` de las tres viajaron sin cambiar, así que los permisos ya asignados siguen
 * valiendo (ver la migración del rename).
 */
export default async function EmpresaComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Obtener permisos (usará cache pre-cargado en layout, sin query adicional)
  const permissions = await getUserPermissionsMapServer();

  return (
    <SectionManagerServer
      paramName="tab"
      searchParams={searchParams}
      defaultTab="general"
      permissions={permissions}
      tabs={[
        {
          value: 'general',
          label: (
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              General
            </span>
          ),
          moduleSlug: 'configuracion',
          tabSlug: 'general',
          content: <GeneralTabContent searchParams={searchParams} permissions={permissions} />,
        },
        {
          value: 'rrhh',
          label: (
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              RRHH
            </span>
          ),
          moduleSlug: 'configuracion',
          tabSlug: 'rrhh',
          content: <RrhhTabContent searchParams={searchParams} permissions={permissions} />,
        },
        {
          value: 'vehicles',
          label: (
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Equipos
            </span>
          ),
          moduleSlug: 'configuracion',
          tabSlug: 'vehicles',
          content: <EquipmentsTabContent searchParams={searchParams} permissions={permissions} />,
        },
        {
          value: 'mantenimiento',
          label: (
            <span className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Mantenimiento
            </span>
          ),
          moduleSlug: 'configuracion',
          tabSlug: 'mantenimiento',
          content: (
            <TabsManagerServer
              paramName="subtab"
              searchParams={searchParams}
              defaultTab="talleres"
              permissions={permissions}
              tabs={[
                {
                  value: 'talleres',
                  label: (
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Talleres
                    </span>
                  ),
                  moduleSlug: 'configuracion',
                  tabSlug: 'talleres',
                  content: (
                    <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
                      <TalleresTab />
                    </Suspense>
                  ),
                },
                {
                  value: 'sectores_taller',
                  label: (
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Sectores
                    </span>
                  ),
                  moduleSlug: 'configuracion',
                  tabSlug: 'sectores_taller',
                  content: (
                    <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
                      <SectoresTab />
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
                  moduleSlug: 'configuracion',
                  tabSlug: 'type_of_repair',
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
                  moduleSlug: 'configuracion',
                  tabSlug: 'maintenance_groups',
                  content: (
                    <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
                      <MaintenanceGroupsWrapper />
                    </Suspense>
                  ),
                },
              ]}
            />
          ),
        },
        {
          value: 'documentos',
          label: (
            <span className="flex items-center gap-2">
              <FileType className="h-4 w-4" />
              Documentos
            </span>
          ),
          moduleSlug: 'configuracion',
          tabSlug: 'documentos',
          content: (
            <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
              <TiposDocumentosTabContent searchParams={searchParams} permissions={permissions} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
