import DocumentNav from '@/components/DocumentNav';
import MonthlyDocuments from '@/features/Employees/Empleados/Documents/Monthly/MonthlyDocuments';
import PermanentDocuments from '@/features/Employees/Empleados/Documents/Permanents/PermanentDocuments';
import { getUserPermissionsMapServer, PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { Calendar, FileArchive } from 'lucide-react';
import { Suspense } from 'react';

export default async function DocumentosEmpleadosTabContent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Obtener permisos (usará cache pre-cargado en layout, sin query adicional)
  const permissions = await getUserPermissionsMapServer();

  return (
    <div>
      {/* Botón crear está en la tab principal, no en subtabs */}
      <PermissionGuardServer module="documentacion" tab="documentos-de-empleados" action="create">
        <div className="flex gap-4 flex-wrap mb-4">
          <DocumentNav onlyEmployees />
        </div>
      </PermissionGuardServer>
      <TabsManagerServer
        paramName="subtab"
        searchParams={searchParams}
        defaultTab="empleados-permanentes"
        permissions={permissions}
        tabs={[
          {
            value: 'empleados-permanentes',
            label: (
              <span className="flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                Documentos Permanentes
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'docs-empleados-permanentes',
            content: (
              <Suspense fallback={<div>Cargando documentos permanentes...</div>}>
                <PermanentDocuments />
              </Suspense>
            ),
          },
          {
            value: 'empleados-mensuales',
            label: (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Documentos Mensuales
              </span>
            ),
            moduleSlug: 'documentacion',
            tabSlug: 'docs-empleados-mensuales',
            content: (
              <Suspense fallback={<div>Cargando documentos mensuales...</div>}>
                <MonthlyDocuments />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
