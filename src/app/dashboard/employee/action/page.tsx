// import {
//   fetchDiagramsByEmployeeId,
//   fetchDiagramsHistoryByEmployeeId,
//   fetchDiagramsTypes,
// } from '@/app/server/GET/actions';
// import EmployeeComponent from '@/components/EmployeeComponent';
// import { Card, CardFooter } from '@/components/ui/card';
// import { fetchCustomers } from '@/features/Empresa/Clientes/actions/customer';
// import { fetchAllContractTypes } from '@/features/Empresa/RRHH/actions/actions';
// import { supabaseServer } from '@/lib/supabase/server';
// import { cn } from '@/lib/utils';
// import { getRole } from '@/lib/utils/getRole';
// import { setEmployeesToShow } from '@/lib/utils/utils';
// import moment from 'moment';
// import { cookies } from 'next/headers';
// import { fetchAllCompanyPositon, fetchAllCostCenter } from './actions/actions';
// export default async function EmployeeFormAction({ searchParams }: { searchParams: any }) {
//   // const { data } = await supabase

//   //   .from('documents_employees')
//   //   .select('*,applies(*),id_document_types(*)')
//   //   .eq('applies.document_number', searchParams.document)
//   //   .not('applies', 'is', null)
//   const role = await getRole();

//   const supabase = supabaseServer();

//   // const { data: userShared } = await supabase
//   //   .from('share_company_users')
//   //   .select('*')
//   //   .eq('profile_id', user?.data?.user?.id || '');

//   const URL = process.env.NEXT_PUBLIC_BASE_URL;

//   const coockiesStore = cookies();
//   const company_id = coockiesStore.get('actualComp')?.value;

//   let formattedEmployee;
//   let guild:
//     | {
//         value: string;
//         label: string;
//       }[]
//     | undefined = undefined;
//   let covenants:
//     | {
//         id: string;
//         name: string;
//         guild_id: string;
//       }[]
//     | undefined = undefined;
//   let categories:
//     | {
//         id: string;
//         name: string;
//         covenant_id: string;
//       }[]
//     | undefined = undefined;
//   if (searchParams.employee_id) {
//     let { data: employees, error } = await supabase
//       .from('employees')
//       .select(
//         `*,
//         guild(name),
//         city(name),
//         province(name),
//         workflow_diagram(name),
//         hierarchical_position(name),
//         birthplace(name),
//         contractor_employee(customers(*)),
//         empleado_aptitudes(aptitud_id, aptitudes_tecnicas(*)),
//         company_position(id, name)`
//       )
//       .eq('id', searchParams.employee_id || '');

//     if (error) {
//       console.log(error, 'error');
//     }

//     //console.log(employees, 'employees');

//     formattedEmployee = setEmployeesToShow(employees)?.[0];
//   }

//   //console.log(formattedEmployee, 'formattedEmployee');

//   let { data: guilds, error } = await supabase
//     .from('guild')
//     .select('*')
//     .eq('company_id', company_id || '')
//     .eq('is_active', true);

//   const guildIds = guilds?.map((guild: any) => guild.id);

//   let { data: covenantsData, error: covenantserror } = await supabase
//     .from('covenant')
//     .select('*')
//     .in('guild_id', guildIds || []);

//   const covenantsIds = covenantsData?.map((covenant) => covenant.id);

//   let { data: categoriesData, error: categorieserror } = await supabase
//     .from('category')
//     .select('*')
//     .in('covenant_id', covenantsIds || []);

//   guild = guilds?.map((guild) => {
//     return {
//       value: guild.id as string,
//       label: guild.name as string,
//     };
//   });
//   covenants = covenantsData?.map((covenant) => {
//     return {
//       id: covenant.id as string,
//       name: covenant.name as string,
//       guild_id: covenant.guild_id as string,
//     };
//   });
//   categories = categoriesData?.map((category) => {
//     return {
//       id: category.id as string,
//       name: category.name as string,
//       covenant_id: category.covenant_id as string,
//     };
//   });

//   const { data: workDiagram } = await supabase.from('work_diagram').select('*').order('name', { ascending: true });

//   const allCostCenter = await fetchAllCostCenter();
//   const diagrams2 = await fetchDiagramsByEmployeeId(searchParams.employee_id);
//   const diagrams_types2 = await fetchDiagramsTypes();
//   const contract_types = await fetchAllContractTypes();
//   const allCompanyPositions = await fetchAllCompanyPositon();
//   const contractorCompanies = await fetchCustomers(company_id || '');

//   console.log(formattedEmployee,'formattedEmployee')

//   return (
//     <section className="grid grid-cols-1 xl:grid-cols-8 gap-3 md:mx-7 py-4">
//       <Card className={cn('col-span-8 flex flex-col justify-between overflow-hidden')}>
//         <EmployeeComponent
//           cost_center={allCostCenter}
//           guild={guild}
//           covenants={covenants}
//           categories={categories}
//           user={formattedEmployee}
//           role={role}
//           diagrams={diagrams2}s
//           diagrams_types={diagrams_types2}
//           activeEmploees={[formattedEmployee]}
//           historyData={historyData}
//           contract_types={contract_types}
//           company_positions={allCompanyPositions}
//           contractorCompanies={contractorCompanies}
//           employeeAptitudes={formattedEmployee?.empleado_aptitudes || []}
//           workDiagram={workDiagram}
//         >
//           <DocumentTable role={role} employee_id={formattedEmployee?.id || ''} />
//         </EmployeeComponent>
//         <CardFooter className="flex flex-row items-center border-t bg-muted dark:bg-muted/50 px-6 py-3"></CardFooter>
//       </Card>
//     </section>
//   );
// }
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
import { fetchAllAptitudesTecnicas, fetchAllContractTypes } from '@/features/Empresa/RRHH/actions/actions';
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
      const startTime = performance.now();
      employee = await getEmployeeById(employee_id);
      const endTime = performance.now();
      console.log(`Time taken to fetch employee: ${endTime - startTime}ms`);
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
