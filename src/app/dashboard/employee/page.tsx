import {
  fetchAllDocumentTypes,
  fetchAllEmployeesWithRelations,
  fetchAllEquipmentWithRelations,
} from '@/app/server/GET/actions';

import EmployesDiagram from '@/components/Diagrams/EmployesDiagram';
import DocumentNav from '@/components/DocumentNav';
import Viewcomponent from '@/components/ViewComponent';
import { getRole } from '@/lib/utils/getRole';
import { cookies } from 'next/headers';
import CovenantTreeFile from '../company/actualCompany/covenant/CovenantTreeFile';
import EmployeeDocumentsTabs from '../document/documentComponents/EmployeeDocumentsTabs';
import EmployeeListTabs from '../document/documentComponents/EmployeeListTabs';
import TypesDocumentAction, {
  setEmployeeDataOptions,
  setVehicleDataOptions,
} from '../document/documentComponents/TypesDocumentAction';
import TypesDocumentsView from '../document/documentComponents/TypesDocumentsView';
import CreatedForm from '../forms/components/CreatedForm';

const EmployeePage = async ({ searchParams }: { searchParams: { tab: string; subtab?: string } }) => {
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get(`document_type_employees`)?.value;
  const savedFilters = cookiesStore.get(`document_type_employees-filters`)?.value;

  const EmployeesOptionsData = setEmployeeDataOptions();
  const VehicleOptionsData = setVehicleDataOptions();
  const empleadosCargados = fetchAllEmployeesWithRelations();
  const equiposCargados = fetchAllEquipmentWithRelations();
  const document_types = fetchAllDocumentTypes();
  const role = getRole();

  const viewData = {
    defaultValue: searchParams?.tab || 'employees',
    path: '/dashboard/employee',
    tabsValues: [
      {
        value: 'employees',
        name: 'Empleados',
        restricted: [],
        content: {
          title: 'Empleados',
          description: 'Aquí encontrarás todos empleados',
          buttonActioRestricted: ['Invitado'],
          component: (
            // <Suspense fallback={<PageTableSkeleton />}>
            <EmployeeListTabs tabValue="employees" subtab={searchParams?.subtab} actives inactives />
            // </Suspense>
          ),
        },
      },
      {
        value: 'Documentos de empleados',
        name: 'Documentos de empleados',
        restricted: ['Invitado'],
        content: {
          title: 'Documentos cargados',
          description: 'Aquí encontrarás todos los documentos de tus empleados',
          buttonActioRestricted: ['Invitado'],
          buttonAction: (
            <div className="flex gap-4 flex-wrap pl-6">
              <DocumentNav onlyEmployees />
            </div>
          ),
          component: (
            <EmployeeDocumentsTabs
              path="/dashboard/employee"
              tabValue="Documentos de empleados"
              subtab={searchParams?.subtab}
            />
          ),
        },
      },
      {
        value: 'diagrams',
        name: 'Diagramas',
        restricted: ['Invitado'],
        content: {
          title: 'Diagramas de personal',
          description: 'Carga de novedades de trabajo del personal',
          buttonActioRestricted: [''],
          component: <EmployesDiagram tabValue="diagrams" subtab={searchParams?.subtab} />,
        },
      },
      {
        value: 'Tipos de documentos',
        name: 'Tipos de documentos',
        restricted: ['Invitado'],
        content: {
          title: 'Tipos de documentos',
          description: 'Tipos de documentos auditables',
          buttonActioRestricted: [''],
          buttonAction: (
            <TypesDocumentAction
              optionChildrenProp="Persona"
              EmployeesOptionsDataPromise={EmployeesOptionsData}
              VehicleOptionsDataPromise={VehicleOptionsData}
              empleadosCargadosPromise={empleadosCargados}
              equiposCargadosPromise={equiposCargados}
              rolePromise={role}
            />
          ),
          component: (
            <TypesDocumentsView
              savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
              savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
              personas
              employeeMockValuesPromise={EmployeesOptionsData}
              vehicleMockValuesPromise={VehicleOptionsData}
              employeesPromise={empleadosCargados}
              vehiclesPromise={equiposCargados}
              document_typesPromise={document_types}
            />
          ),
        },
      },
      {
        value: 'covenant',
        name: 'CCT',
        restricted: ['Invitado'],
        content: {
          title: 'Convenios colectivos de trabajo',
          description: 'Lista de Convenios colectivos de trabajo',
          buttonActioRestricted: [''],
          component: <CovenantTreeFile />,
        },
      },
      {
        value: 'forms',
        name: 'Formularios',
        restricted: [],
        content: {
          title: 'Formularios',
          description: 'Formularios de empleados',
          buttonActioRestricted: [''],
          component: <CreatedForm />,
        },
      },
    ],
  };

  return (
    // <Suspense fallback={<PageTableSkeleton />}>
    <Viewcomponent viewData={viewData} />
    // </Suspense>
  );
};

export default EmployeePage;
