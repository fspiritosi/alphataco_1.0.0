import EmployesDiagram from '@/components/Diagrams/EmployesDiagram';
import DocumentNav from '@/components/DocumentNav';
import { buttonVariants } from '@/components/ui/button';
import TiposDocumentosTabContent from '@/features/Documentacion/TiposDocumentos/TiposDocumentosTabContent';
import MonthlyDocuments from '@/features/Employees/Empleados/Documents/Monthly/MonthlyDocuments';
import PermanentDocuments from '@/features/Employees/Empleados/Documents/Permanents/PermanentDocuments';
import EmployeeTable from '@/features/Employees/Empleados/EmpleadosTables/Activos/employee_table';
import EmpleadosInactivosTable from '@/features/Employees/Empleados/EmpleadosTables/Inactivos/EmpleadosInactivosTable';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { getUserPermissionsMapServer, PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { DataTableSkeleton } from '@/shared/components/data-table/base/data-table-skeleton';
import { Calendar, FileArchive, FileCheck, FileText, FileType, GitBranch, UserCheck, Users, UserX } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Suspense } from 'react';
import CovenantTreeFileWrapper from '../company/actualCompany/covenant/CovenantTreeFileWrapper';

export async function generateMetadata() {
  const cookiesStore = await cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Empleados | ${companyName}`,
      description: `Página de empresa de ${companyName} con información general, comercial, HR y equipos`,
    };
  } else {
    const actualCompany = await getCompanyName();
    if (actualCompany) {
      return {
        title: `Empleados | ${actualCompany.company_name}`,
        description: `Página de empresa de ${actualCompany.company_name} con información general, comercial, HR y equipos`,
      };
    }
  }
}

export default async function EmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Obtener permisos (usará cache pre-cargado en layout, sin query adicional)
  const permissions = await getUserPermissionsMapServer();
  const resolvedSearchParams = await searchParams;

  return (
    <div>
      <TabsManagerServer
        paramName="tab"
        searchParams={resolvedSearchParams}
        defaultTab="employees"
        dependentParams={['subtab']}
        permissions={permissions}
        tabs={[
          {
            value: 'employees',
            label: (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Empleados
              </span>
            ),
            moduleSlug: 'empleados' as const,
            tabSlug: 'employees' as const,
            content: (
              <div>
                <div className="flex gap-4 flex-wrap mb-4">
                  <PermissionGuardServer module="empleados" tab="employees" action="create">
                    <Link
                      className={buttonVariants({ variant: 'gh_orange' })}
                      href={'/dashboard/employee/action?action=new'}
                    >
                      Agregar empleado
                    </Link>
                  </PermissionGuardServer>
                </div>
                <TabsManagerServer
                  paramName="subtab"
                  searchParams={resolvedSearchParams}
                  defaultTab="empleados-activos"
                  permissions={permissions}
                  tabs={[
                    {
                      value: 'empleados-activos',
                      label: (
                        <span className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Empleados Activos
                        </span>
                      ),
                      moduleSlug: 'empleados',
                      tabSlug: 'empleados-activos',
                      content: (
                        <Suspense fallback={<DataTableSkeleton columns={7} />}>
                          <EmployeeTable />
                        </Suspense>
                      ),
                    },
                    {
                      value: 'empleados-inactivos',
                      label: (
                        <span className="flex items-center gap-2">
                          <UserX className="h-4 w-4" />
                          Empleados Inactivos
                        </span>
                      ),
                      moduleSlug: 'empleados',
                      tabSlug: 'empleados-inactivos',
                      content: (
                        <Suspense fallback={<DataTableSkeleton columns={7} />}>
                          <EmpleadosInactivosTable />
                        </Suspense>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
          {
            value: 'documentos-de-empleados',
            label: (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos de Empleados
              </span>
            ),
            moduleSlug: 'empleados',
            tabSlug: 'documentos-de-empleados',
            content: (
              <div>
                <div className="flex gap-4 flex-wrap mb-4">
                  <PermissionGuardServer module="empleados" tab="documentos-de-empleados" action="create">
                    <DocumentNav onlyEmployees />
                  </PermissionGuardServer>
                </div>
                <TabsManagerServer
                  paramName="subtab"
                  searchParams={resolvedSearchParams}
                  defaultTab="docs-empleados-permanentes"
                  permissions={permissions}
                  tabs={[
                    {
                      value: 'docs-empleados-permanentes',
                      label: (
                        <span className="flex items-center gap-2">
                          <FileArchive className="h-4 w-4" />
                          Documentos Permanentes
                        </span>
                      ),
                      moduleSlug: 'empleados',
                      tabSlug: 'docs-empleados-permanentes',
                      content: (
                        <Suspense fallback={<DataTableSkeleton columns={5} />}>
                          <PermanentDocuments />
                        </Suspense>
                      ),
                    },
                    {
                      value: 'docs-empleados-mensuales',
                      label: (
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Documentos Mensuales
                        </span>
                      ),
                      moduleSlug: 'empleados',
                      tabSlug: 'docs-empleados-mensuales',
                      content: (
                        <Suspense fallback={<DataTableSkeleton columns={5} />}>
                          <MonthlyDocuments />
                        </Suspense>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
          {
            value: 'diagrams',
            label: (
              <span className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Diagramas
              </span>
            ),
            moduleSlug: 'empleados' as const,
            tabSlug: 'diagrams' as const,
            content: <EmployesDiagram searchParams={resolvedSearchParams} permissions={permissions} />,
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
            moduleSlug: 'documentacion' as const,
            tabSlug: 'tipos-de-documentos' as const,
            content: (
              <Suspense fallback={<DataTableSkeleton columns={4} />}>
                <TiposDocumentosTabContent
                  searchParams={resolvedSearchParams}
                  showOnlyPersonas={true}
                  permissions={permissions}
                />
              </Suspense>
            ),
          },
          {
            value: 'covenant',
            label: (
              <span className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                CCT
              </span>
            ),
            moduleSlug: 'empleados' as const,
            tabSlug: 'covenant' as const,
            content: (
              <Suspense fallback={<DataTableSkeleton columns={3} rows={5} />}>
                <CovenantTreeFileWrapper />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
