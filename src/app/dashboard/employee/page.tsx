import EmployesDiagram from '@/components/Diagrams/EmployesDiagram';
import DocumentNav from '@/components/DocumentNav';
import MonthlyDocuments from '@/features/Employees/Empleados/Documents/Monthly/MonthlyDocuments';
import PermanentDocuments from '@/features/Employees/Empleados/Documents/Permanents/PermanentDocuments';
import EmployeeTable from '@/features/Employees/Empleados/EmpleadosTables/Activos/employee_table';
import EmpleadosInactivosTable from '@/features/Employees/Empleados/EmpleadosTables/Inactivos/EmpleadosInactivosTable';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { TabsManagerServer } from '@/features/TabsManager';
import { Calendar, FileArchive, FileCheck, FileText, FileType, GitBranch, UserCheck, Users, UserX } from 'lucide-react';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import CovenantTreeFileWrapper from '../company/actualCompany/covenant/CovenantTreeFileWrapper';
import TypesDocumentsViewWrapper from '../document/documentComponents/TypesDocumentsViewWrapper';

export async function generateMetadata() {
  const cookiesStore = cookies();
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
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div className="px-6">
      <TabsManagerServer
        paramName="tab"
        searchParams={searchParams}
        defaultTab="employees"
        dependentParams={['subtab']}
        tabs={[
          {
            value: 'employees',
            label: (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Empleados
              </span>
            ),
            moduleSlug: 'empleados',
            tabSlug: 'employees',
            content: (
              <div>
                <TabsManagerServer
                  paramName="subtab"
                  searchParams={searchParams}
                  defaultTab="empleados-activos"
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
                        <Suspense fallback={<div>Cargando empleados activos...</div>}>
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
                        <Suspense fallback={<div>Cargando empleados inactivos...</div>}>
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
                  <DocumentNav onlyEmployees />
                </div>
                <TabsManagerServer
                  paramName="subtab"
                  searchParams={searchParams}
                  defaultTab="docs-empleados-permanentes"
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
                        <Suspense fallback={<div>Cargando documentos permanentes...</div>}>
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
                        <Suspense fallback={<div>Cargando documentos mensuales...</div>}>
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
            moduleSlug: 'empleados',
            tabSlug: 'diagrams',
            content: <EmployesDiagram searchParams={searchParams} />,
          },
          {
            value: 'tipos-de-documentos',
            label: (
              <span className="flex items-center gap-2">
                <FileType className="h-4 w-4" />
                Tipos de Documentos
              </span>
            ),
            moduleSlug: 'empleados',
            tabSlug: 'tipos-de-documentos',
            content: (
              <Suspense fallback={<div>Cargando tipos de documentos...</div>}>
                <TypesDocumentsViewWrapper optionChildrenProp="Persona" />
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
            moduleSlug: 'empleados',
            tabSlug: 'covenant',
            content: (
              <Suspense fallback={<div>Cargando convenios...</div>}>
                <CovenantTreeFileWrapper />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
