import DocumentTable from '@/app/dashboard/document/DocumentTable';
import {
  fetchDiagramsByEmployeeId,
  fetchDiagramsHistoryByEmployeeId,
  fetchDiagramsTypes,
  getEmployeeById,
  getEmployeeNameById,
} from '@/app/server/GET/actions';
import BackButton from '@/components/BackButton';
import { DiagramDetailEmployeeView } from '@/components/Diagrams/DiagramDetailEmployeeView';
import { Card } from '@/components/ui/card';
import { EmployeeHeader } from '@/features/Employees/EmpleadoID/components/employee-header';
import { EmployeeTabs } from '@/features/Employees/EmpleadoID/components/employee-tabs';
import { EmployeeHeaderSkeleton } from '@/features/Employees/EmpleadoID/components/skeletons/employee-header-skeleton';
import {
  fetchAllCostCenters,
  fetchCategories,
  fetchCitiesByProvinceId,
  fetchCompanyPositions,
  fetchContractorCompanies,
  fetchCovenants,
  fetchGuilds,
  fetchHierarchicalPositions,
  fetchProvinces,
  fetchWorkflowDiagrams,
} from '@/features/Employees/EmpleadoID/lib/actions/catalog-actions';
import { fetchAllAptitudesTecnicas } from '@/features/Empresa/RRHH/actions/actions';
import { fetchAllContractTypes } from '@/features/Empresa/RRHH/components/TypeContract/actions/actions';
import { fetchCountrys } from '@/shared/actions/employees.actions';
import moment from 'moment';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

interface EmployeePageProps {
  params: {
    employee_id: string;
  };
  searchParams: {
    action?: 'view' | 'edit' | 'new';
    employee_id?: string;
  };
}

export default async function EmployeePage({ searchParams }: EmployeePageProps) {
  const mode = searchParams.action || 'view';
  const employee_id = searchParams.employee_id || 'view';
  const showEditButton = mode === 'view' || mode === 'new';
  const exitEditMode = mode === 'edit';
  if (!employee_id) {
    notFound();
  }

  let employee: Awaited<ReturnType<typeof getEmployeeById>> = null;

  if (mode !== 'new') {
    try {
      employee = await getEmployeeById(employee_id);
      if (!employee) {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
      notFound();
    }
  }

  const countries = fetchCountrys();
  const costCenters = fetchAllCostCenters();
  const hierarchicalPositions = fetchHierarchicalPositions();
  const companyPositions = fetchCompanyPositions();
  const workflowDiagrams = fetchWorkflowDiagrams();
  const guilds = fetchGuilds();
  const covenants = fetchCovenants();
  const categories = fetchCategories();
  const contractorCompanies = fetchContractorCompanies();
  const provinces = fetchProvinces();
  const cities = fetchCitiesByProvinceId(employee?.provinces?.id!);
  const typeOfContracts = fetchAllContractTypes();
  const aptitudes = fetchAllAptitudesTecnicas();

  const historyData = (await fetchDiagramsHistoryByEmployeeId(employee_id)).map((item) => ({
    date: moment.utc(item.prev_date).format('DD/MM/YYYY'),
    description: item.description,
    status: item.state,
    previousStatus: item.prev_state,
    modifiedBy: (item.modified_by as any)?.fullname
      ?.split(' ')
      .map((name: any) => name.charAt(0).toUpperCase() + name.slice(1))
      .join(' '), // Mapear las iniciales a mayúsculas
    modifiedAt: moment(item.created_at).local().format('DD/MM/YYYY HH:mm'), // Formatear a la hora local
    type: item.prev_state ? 'modified' : 'created',
  }));
  const diagrams2 = await fetchDiagramsByEmployeeId(employee_id);
  const diagrams_types2 = await fetchDiagramsTypes();
  return (
    <div className=" p-6 space-y-6">
      <Card>
        {/* Employee Header */}
        {mode !== 'new' ? (
          <Suspense fallback={<EmployeeHeaderSkeleton />}>
            <EmployeeHeader
              employee={employee}
              isEditable={true}
              showEditButton={showEditButton}
              exitEditMode={exitEditMode}
            />
          </Suspense>
        ) : (
          <div className="flex justify-end p-4 pb-0">
            <BackButton />
          </div>
        )}
        {/* Employee Tabs */}
        <EmployeeTabs
          employeeId={employee_id}
          mode={mode}
          employee={employee}
          //Componentes
          documentsComponent={<DocumentTable employee_id={employee_id} />}
          diagramsComponent={
            <DiagramDetailEmployeeView
              historyData={historyData}
              diagrams={diagrams2 as any}
              diagrams_types={diagrams_types2}
              activeEmploees={[employee]}
            />
          }
          // Promises para las opciones
          countriesPromise={countries}
          costCentersPromise={costCenters}
          hierarchicalPositionsPromise={hierarchicalPositions}
          companyPositionsPromise={companyPositions}
          workflowDiagramsPromise={workflowDiagrams}
          guildsPromise={guilds}
          covenantsPromise={covenants}
          categoriesPromise={categories}
          contractorCompaniesPromise={contractorCompanies}
          provincesPromise={provinces}
          citiesPromise={cities}
          typeOfContractsPromise={typeOfContracts}
          aptitudesPromise={aptitudes}
        />
      </Card>
    </div>
  );
}

// Generate metadata for the page
export async function generateMetadata({ searchParams }: EmployeePageProps) {
  const { employee_id } = searchParams;
  if (!employee_id) {
    const cookiesStore = cookies();
    const companyName = cookiesStore.get('actualCompName')?.value;
    return {
      title: `Registrar Nuevo Empleado | ${companyName}`,
      description: 'Crear y registrar un nuevo perfil de empleado en el sistema',
    };
  }
  const employee = await getEmployeeNameById(employee_id);
  return {
    title: `Empleado - ${employee?.firstname} ${employee?.lastname}`,
    description: 'Información detallada del empleado',
  };
}
