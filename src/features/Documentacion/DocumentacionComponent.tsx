import { Skeleton } from '@/components/ui/skeleton';
import { getUserPermissionsMapServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { Building2, FileType, Truck, Users } from 'lucide-react';
import { Suspense } from 'react';
import DocumentosEmpleadosTabContent from './DocumentosEmpleados/DocumentosEmpleadosTabContent';
import DocumentosEmpresaTabContent from './DocumentosEmpresa/DocumentosEmpresaTabContent';
import DocumentosEquiposTabContent from './DocumentosEquipos/DocumentosEquiposTabContent';
import TiposDocumentosTabContent from './TiposDocumentos/TiposDocumentosTabContent';

export default async function DocumentacionComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Obtener permisos (usará cache pre-cargado en layout, sin query adicional)
  const permissions = await getUserPermissionsMapServer();

  return (
    <div className="">
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="documentos-de-empleados"
        dependentParams={['subtab']}
        permissions={permissions}
        tabs={[
          {
            value: 'documentos-de-empleados',
            label: (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Documentos de Empleados
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'documentos-de-empleados',
            content: <DocumentosEmpleadosTabContent searchParams={searchParams} permissions={permissions} />,
          },
          {
            value: 'documentos-de-equipos',
            label: (
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Documentos de Equipos
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'documentos-de-equipos',
            content: <DocumentosEquiposTabContent searchParams={searchParams} permissions={permissions} />,
          },
          {
            value: 'documentos-de-empresa',
            label: (
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Documentos de Empresa
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'documentos-de-empresa',
            content: <DocumentosEmpresaTabContent searchParams={searchParams} permissions={permissions} />,
          },
          {
            value: 'tipos-de-documentos',
            label: (
              <span className="flex items-center gap-2">
                <FileType className="h-4 w-4" />
                Tipos de Documentos
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'tipos-de-documentos',
            content: (
              <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
                <TiposDocumentosTabContent searchParams={searchParams} permissions={permissions} />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
