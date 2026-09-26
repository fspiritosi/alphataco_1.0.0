import TiposDocumentosTabContent from '@/features/Documentacion/TiposDocumentos/TiposDocumentosTabContent';
import RepairTypes from '@/features/Mantenimiento/TiposReparaciones/RepairTypes';
import { SectionManagerServer } from '@/features/TabsManager';
import { DataTableSkeleton } from '@/shared/components/data-table/base/data-table-skeleton';
import { FileText, FileType, Truck, Wrench } from 'lucide-react';
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
      <SectionManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="equipos"
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
            content: <EquiposTabContent searchParams={searchParams} permissions={permissions} />,
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
            // Hereda el permiso de configuracion/documentos, que es donde vive la tab.
            moduleSlug: 'configuracion',
            tabSlug: 'documentos',
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
