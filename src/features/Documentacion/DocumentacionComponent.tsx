
import { getUserPermissionsMapServer } from '@/features/Permissions';
import { SectionManagerServer } from '@/features/TabsManager';
import { Building2, Truck, Users } from 'lucide-react';

import DocumentosEmpleadosTabContent from './DocumentosEmpleados/DocumentosEmpleadosTabContent';
import DocumentosEmpresaTabContent from './DocumentosEmpresa/DocumentosEmpresaTabContent';
import DocumentosEquiposTabContent from './DocumentosEquipos/DocumentosEquiposTabContent';

export default async function DocumentacionComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Obtener permisos (usará cache pre-cargado en layout, sin query adicional)
  const permissions = await getUserPermissionsMapServer();

  return (
    <div className="">
      <SectionManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="documentos-de-empleados"
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
        ]}
      />
    </div>
  );
}
