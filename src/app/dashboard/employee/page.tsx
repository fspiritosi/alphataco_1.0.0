import DocumentNav from '@/components/DocumentNav';
import { MonthlyEmployeeDocumentsSkeleton } from '@/features/Documentacion/DocumentosEmpleados/Mensuales/fallback/MonthlyEmployeeDocumentsSkeleton';
import { MonthlyEmployeeDocumentsList } from '@/features/Documentacion/DocumentosEmpleados/Mensuales/MonthlyEmployeeDocumentsList';
import { EmployeePermanentDocumentsList } from '@/features/Documentacion/DocumentosEmpleados/Permanentes/EmployeePermanentDocumentsList';
import { EmployeePermanentDocumentsSkeleton } from '@/features/Documentacion/DocumentosEmpleados/Permanentes/fallback/EmployeePermanentDocumentsSkeleton';
import { TiposDocumentosSkeleton } from '@/features/Documentacion/TiposDocumentos/fallback/TiposDocumentosSkeleton';
import TiposDocumentosTabContent from '@/features/Documentacion/TiposDocumentos/TiposDocumentosTabContent';
import EmployesDiagram from '@/features/Employees/Diagrams/EmployesDiagram';
import { DiagramsSkeleton } from '@/features/Employees/Diagrams/fallback/DiagramsSkeleton';
import EmployeeList from '@/features/Employees/Empleados/EmployeeList/EmployeeList';
import { EmployeeTableSkeleton } from '@/features/Employees/Empleados/EmployeeList/fallback/EmployeeTableSkeleton';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { getUserPermissionsMapServer, PermissionGuardServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { Calendar, FileArchive, FileCheck, FileText, FileType, GitBranch, UserCheck, Users, UserX } from 'lucide-react';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import CovenantTreeFileWrapper from '../company/actualCompany/covenant/CovenantTreeFileWrapper';
import { CovenantTreeSkeleton } from '../company/actualCompany/covenant/fallback/CovenantTreeSkeleton';

export async function generateMetadata() {
  const cookiesStore = await cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Empleados | ${companyName}`,
      description: `Pagina de empresa de ${companyName} con informacion general, comercial, HR y equipos`,
    };
  } else {
    const actualCompany = await getCompanyName();
    if (actualCompany) {
      return {
        title: `Empleados | ${actualCompany.company_name}`,
        description: `Pagina de empresa de ${actualCompany.company_name} con informacion general, comercial, HR y equipos`,
      };
    }
  }
}

export default async function EmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const permissions = await getUserPermissionsMapServer();
  const resolvedSearchParams = await searchParams;

  return (
    <TabsManagerServer
      paramName="tab"
      searchParams={resolvedSearchParams}
      defaultTab="employees"
      dependentParams={['subtab']}
      permissions={permissions}
      // variant="line"
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
                    <Suspense fallback={<EmployeeTableSkeleton />}>
                      <EmployeeList searchParams={resolvedSearchParams} isActive={true} permissions={permissions} />
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
                    <Suspense fallback={<EmployeeTableSkeleton />}>
                      <EmployeeList searchParams={resolvedSearchParams} isActive={false} permissions={permissions} />
                    </Suspense>
                  ),
                },
              ]}
            />
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
            <TabsManagerServer
              paramName="subtab"
              searchParams={resolvedSearchParams}
              defaultTab="docs-empleados-permanentes"
              permissions={permissions}
              actions={
                <PermissionGuardServer module="empleados" tab="documentos-de-empleados" action="create">
                  <DocumentNav onlyEmployees />
                </PermissionGuardServer>
              }
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
                    <Suspense fallback={<EmployeePermanentDocumentsSkeleton />}>
                      <EmployeePermanentDocumentsList searchParams={resolvedSearchParams} />
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
                    <Suspense fallback={<MonthlyEmployeeDocumentsSkeleton />}>
                      <MonthlyEmployeeDocumentsList searchParams={resolvedSearchParams} />
                    </Suspense>
                  ),
                },
              ]}
            />
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
          content: (
            <Suspense fallback={<DiagramsSkeleton />}>
              <EmployesDiagram searchParams={resolvedSearchParams} permissions={permissions} />
            </Suspense>
          ),
        },
        {
          value: 'tipos-de-documentos',
          label: (
            <span className="flex items-center gap-2">
              <FileType className="h-4 w-4" />
              Tipos de Documentos
            </span>
          ),
          moduleSlug: 'documentacion' as const,
          tabSlug: 'tipos-de-documentos' as const,
          content: (
            <Suspense fallback={<TiposDocumentosSkeleton />}>
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
            <Suspense fallback={<CovenantTreeSkeleton />}>
              <CovenantTreeFileWrapper />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
