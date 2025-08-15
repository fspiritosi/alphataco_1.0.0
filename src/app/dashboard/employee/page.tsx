import EmployesDiagram from '@/components/Diagrams/EmployesDiagram';
import DocumentNav from '@/components/DocumentNav';
import ViewComponent from '@/components/ViewComponent';
import CovenantTreeFile from '../company/actualCompany/covenant/CovenantTreeFile';
import EmployeeDocumentsTabs from '../document/documentComponents/EmployeeDocumentsTabs';
import EmployeeListTabs from '../document/documentComponents/EmployeeListTabs';
import TypesDocumentsViewWrapper from '../document/documentComponents/TypesDocumentsViewWrapper';

export const metadata = {
  title: 'Empleados | GH Gestión',
  description: 'Página de empleados de GH Gestión con información general, comercial, HR y equipos',
};
const EmployeePage = ({ searchParams }: { searchParams: { tab: string; subtab?: string } }) => {
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
          component: <EmployeeListTabs tabValue="employees" subtab={searchParams?.subtab} actives inactives />,
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
          // El botón ahora se pasa automáticamente desde TypesDocumentsViewWrapper
          component: <TypesDocumentsViewWrapper optionChildrenProp="Persona" />,
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
      // {
      //   value: 'forms',
      //   name: 'Formularios',
      //   restricted: [],
      //   content: {
      //     title: 'Formularios',
      //     description: 'Formularios de empleados',
      //     buttonActioRestricted: [''],
      //     component: <CreatedForm />,
      //   },
      // },
    ],
  };

  return <ViewComponent viewData={viewData} />;
};

export default EmployeePage;
