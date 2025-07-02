import CovenantTreeFile from '@/app/dashboard/company/actualCompany/covenant/CovenantTreeFile';
import ViewComponentInternal from '@/components/ViewComponentInternal';
import ContractTypeTabWrapper from '@/features/Empresa/RRHH/components/ContractTypeTabWrapper';
import DiagramTypeComponentWrapper from '@/features/Empresa/RRHH/components/Diagrams/DiagramTypeComponentWrapper';
import PositionsTab from '../rrhh/company_positions/positionsTab';
import AptitudesTab from './aptitudesTecnicas/aptitudesTab';
import DiagramTypesTabWrapper from './diagramTypesTab/DiagramTypesTabWrapper';

export default function RrhhComponent({ tabValue, subtab }: { subtab?: string; tabValue: string }) {
  const viewData = {
    defaultValue: subtab || 'listado',
    path: '/dashboard/company/actualCompany',
    tabsValues: [
      {
        value: 'listado',
        name: 'Tipos de Diagramas',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Tipos de Diagramas',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <DiagramTypesTabWrapper />,
        },
      },
      {
        value: 'diagrams',
        name: 'Tipos de Novedades',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Tipos de Novedades',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <DiagramTypeComponentWrapper />,
        },
      },
      {
        value: 'convenios',
        name: 'CCT',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'CCT',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <CovenantTreeFile />,
        },
      },
      {
        value: 'contract-types',
        name: 'Tipos de Contrato',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Tipos de Contrato',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <ContractTypeTabWrapper />,
        },
      },
      {
        value: 'positions',
        name: 'Puestos',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Puestos',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: (
            <PositionsTab

            // data={positions}
            // savedVisibility={savedVisibilityPositions ? JSON.parse(savedVisibilityPositions) : {}}
            // hierarchicalData={hierarchicalPositions}
            />
          ),
        },
      },
      {
        value: 'aptitudes',
        name: 'APT',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'APT',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <AptitudesTab />,
        },
      },
    ],
  };
  return (
    <div>
      <ViewComponentInternal currentMainTab={tabValue} viewData={viewData} />
    </div>
  );
}
