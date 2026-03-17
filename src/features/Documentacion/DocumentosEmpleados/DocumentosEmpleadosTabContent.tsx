import DocumentNav from '@/features/Documentacion/shared/components/DocumentNav';
import { PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { Calendar, FileArchive } from 'lucide-react';
import { Suspense } from 'react';
import { MonthlyEmployeeDocumentsList } from './Mensuales/MonthlyEmployeeDocumentsList';
import { MonthlyEmployeeDocumentsSkeleton } from './Mensuales/fallback/MonthlyEmployeeDocumentsSkeleton';
import { EmployeePermanentDocumentsList } from './Permanentes/EmployeePermanentDocumentsList';
import { EmployeePermanentDocumentsSkeleton } from './Permanentes/fallback/EmployeePermanentDocumentsSkeleton';

export default async function DocumentosEmpleadosTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
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
              <Suspense fallback={<EmployeePermanentDocumentsSkeleton />}>
                <EmployeePermanentDocumentsList searchParams={searchParams} />
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
              <Suspense fallback={<MonthlyEmployeeDocumentsSkeleton />}>
                <MonthlyEmployeeDocumentsList searchParams={searchParams} />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
