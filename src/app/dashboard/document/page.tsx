import DocumentNav from '@/components/DocumentNav';
import Viewcomponent from '@/components/ViewComponent';
import CompanyTabsWrapper from './documentComponents/CompanyTabsWrapper';
import EmployeeDocumentsTabs from './documentComponents/EmployeeDocumentsTabs';
import EquipmentTabs from './documentComponents/EquipmentTabs';
import TypesDocumentsViewWrapper from './documentComponents/TypesDocumentsViewWrapper';

export default function page({
  params,
}: {
  params: {
    tab: string;
    subtab: string;
  };
}) {
  const viewData = {
    defaultValue: 'Documentos de empleados',
    path: '/dashboard/document',
    tabsValues: [
      {
        value: 'Documentos de empleados',
        name: 'Documentos de empleados',
        restricted: [''],
        content: {
          title: 'Documentos cargados',
          description: 'Aquí encontrarás todos los documentos de tus empleados',
          buttonActioRestricted: [''],
          buttonAction: (
            <div className="flex gap-4 flex-wrap pl-6">
              <DocumentNav onlyEmployees onlyEquipment />
            </div>
          ),
          component: <EmployeeDocumentsTabs path="/dashboard/document" tabValue={params.tab} subtab={params.subtab} />,
        },
      },
      {
        value: 'Documentos de equipos',
        name: 'Documentos de equipos',
        restricted: [''],
        content: {
          title: 'Documentos cargados',
          description: 'Aquí encontrarás todos los documentos de tus equipos',
          buttonActioRestricted: [''],
          buttonAction: (
            <div className="flex gap-4 flex-wrap pl-6">
              <DocumentNav />
            </div>
          ),
          component: <EquipmentTabs path="/dashboard/equipment" tabValue={params.tab} subtab={params.subtab} />,
        },
      },
      {
        value: 'Documentos de empresa',
        name: 'Documentos de empresa',
        restricted: [''],
        content: {
          title: 'Documentos cargados',
          description: 'Aquí encontrarás todos los documentos de tus empresa',
          buttonActioRestricted: [''],
          buttonAction: (
            <div className="flex gap-4 flex-wrap pl-6">
              <DocumentNav />
            </div>
          ),
          component: (
            <CompanyTabsWrapper path="/dashboard/document" tabValue="Documentos de empresa" subtab={params.subtab} />
          ),
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
          component: (
            <TypesDocumentsViewWrapper optionChildrenProp="all" equipos={true} empresa={true} personas={true} />
          ),
        },
      },
      // {
      //   value: 'forms',
      //   name: 'Formularios',
      //   restricted: [],
      //   content: {
      //     title: 'Formularios',
      //     description: 'Formularios de documentos',
      //     buttonActioRestricted: [''],
      //     // buttonAction: <TypesDocumentAction optionChildrenProp="Personas" />,
      //     component: <CreatedForm />,
      //   },
      // },
    ],
  };

  return <Viewcomponent viewData={viewData} />;
}
