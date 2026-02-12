import RepairTypes from '@/components/Tipos_de_reparaciones/RepairTypes';
import { buttonVariants } from '@/components/ui/button';
import TiposDocumentosTabContent from '@/features/Documentacion/TiposDocumentos/TiposDocumentosTabContent';
import { PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { DataTableSkeleton } from '@/shared/components/data-table/base/data-table-skeleton';
import { FileText, FileType, Truck, Wrench } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import DocumentosEquiposTabContent from './DocumentosEquipos/DocumentosEquiposTabContent';
import EquiposTabContent from './Equipos/EquiposTabContent';

export default async function EquiposComponent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  return (
    <div>
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="equipos"
        dependentParams={['subtab']}
        permissions={permissions}
        tabs={[
          {
            value: 'equipos',
            label: (
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Equipos
              </span>
            ),
            moduleSlug: 'equipos',
            tabSlug: 'equipos',
            content: (
              <div>
                <PermissionGuardServer module="equipos" tab="equipos" action="create">
                  <div className="flex gap-4 flex-wrap mb-4">
                    <Link
                      className={buttonVariants({ variant: 'gh_orange' })}
                      href={'/dashboard/equipment/action?action=new'}
                    >
                      Agregar equipo
                    </Link>
                  </div>
                </PermissionGuardServer>
                <EquiposTabContent searchParams={searchParams} permissions={permissions} />
              </div>
            ),
          },
          {
            value: 'documentos-de-equipos',
            label: (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos de Equipos
              </span>
            ),
            moduleSlug: 'equipos',
            tabSlug: 'documentos-de-equipos',
            content: <DocumentosEquiposTabContent searchParams={searchParams} permissions={permissions} />,
          },
          {
            value: 'tipos-de-documentos',
            label: (
              <span className="flex items-center gap-2">
                <FileType className="h-4 w-4" />
                Tipos de Documentos
              </span>
            ),
            // Hereda permisos de documentacion/tipos-de-documentos
            moduleSlug: 'documentacion',
            tabSlug: 'tipos-de-documentos',
            content: (
              <Suspense fallback={<DataTableSkeleton columns={4} />}>
                <TiposDocumentosTabContent
                  searchParams={searchParams}
                  showOnlyEquipos={true}
                  permissions={permissions}
                />
              </Suspense>
            ),
          },
          {
            value: 'type_of_repairs',
            label: (
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Mantenimiento
              </span>
            ),
            moduleSlug: 'equipos',
            tabSlug: 'type_of_repairs',
            content: <RepairTypes searchParams={searchParams} moduleSlug="equipos" permissions={permissions} />,
          },
        ]}
      />
    </div>
  );
}
