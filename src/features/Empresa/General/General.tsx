import TypesDocumentAction, {
  setEmployeeDataOptions,
  setVehicleDataOptions,
} from '@/app/dashboard/document/documentComponents/TypesDocumentAction';
import DocumentTabComponent from '@/components/DocumentTabComponent';
import EditCompanyButton from '@/components/EditCompanyButton';
import { RegisterWithRole } from '@/components/RegisterWithRole';
import CompanyComponent from '@/features/Empresa/General/components/company/CompanyComponent';
// import DangerZoneComponent from '@/features/Empresa/General/components/company/DangerZoneComponent';
import { fetchAllEmployeesWithRelations, fetchAllEquipmentWithRelations } from '@/app/server/GET/actions';

import ViewcomponentInternal from '@/components/ViewComponentInternal';

import { getRole } from '@/lib/utils/getRole';
import { cookies } from 'next/headers';
import UsersTabComponent from '../Usuarios/UsersTabComponent';
import { fetchAllCostCenters, fetchAllSectors, getCompany } from './actions/actions';
import CostCenterTab from './components/cost-center/CostCenterTab';
import OrganigramTab from './components/organigrama/OrganigramTab';
async function General({ tabValue, subtab }: { subtab?: string; tabValue: string }) {
  const coockiesStore = cookies();
  const company_id = coockiesStore.get('actualComp')?.value;
  const costCenters = await fetchAllCostCenters();
  const companyData = await getCompany();
  const sectors = await fetchAllSectors();
  const EmployeesOptionsData = await setEmployeeDataOptions();
  const VehicleOptionsData = await setVehicleDataOptions();

  const empleadosCargados = await fetchAllEmployeesWithRelations();
  const equiposCargados = await fetchAllEquipmentWithRelations();
  const role = await getRole();

  const savedVisibilityCostCenter = coockiesStore.get('cost-center-table')?.value;
  const savedFilterCostCenter = coockiesStore.get('cost-center-table-filter')?.value;
  const savedVisibilityOrganigram = coockiesStore.get('organigram-table')?.value;
  const savedFilterOrganigram = coockiesStore.get('organigram-table-filter')?.value;

  const viewData = {
    defaultValue: subtab || 'company',
    path: '/dashboard/company/actualCompany',
    tabsValues: [
      {
        value: 'company',
        name: 'Empresa',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Empresa',
          //description: 'Información de la empresa',
          buttonActioRestricted: [''],
          buttonAction: <EditCompanyButton companyId={company_id?.toString() ?? ''} />,
          component: <CompanyComponent company={companyData[0] as any} />,
        },
      },
      {
        value: 'cost-center',
        name: 'Centro de Costos',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Centro de Costos',
          //description: 'Lista de documentos a nombre de la empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: (
            <CostCenterTab
              savedFilter={savedFilterCostCenter ? JSON.parse(savedFilterCostCenter) : []}
              costCenters={costCenters}
              savedVisibility={savedVisibilityCostCenter ? JSON.parse(savedVisibilityCostCenter) : {}}
            />
          ),
        },
      },
      {
        value: 'organigrama',
        name: 'Organigrama',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Organigrama',
          //description: 'Lista de usuarios de la empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: (
            <OrganigramTab
              sectors={sectors}
              savedVisibility={savedVisibilityOrganigram ? JSON.parse(savedVisibilityOrganigram) : {}}
              savedFilter={savedFilterOrganigram ? JSON.parse(savedFilterOrganigram) : []}
            />
          ),
        },
      },
      {
        value: 'users',
        name: 'Usuarios',
        restricted: [''],
        tab: tabValue,
        //options:[{value:"employees", label:"Empleados"}, {value:"no-employees", label:"Invitados"}],
        content: {
          title: 'Usuarios',
          //description: 'Lista de usuarios de la empresa',
          buttonActioRestricted: [''],
          buttonAction: <RegisterWithRole />,
          //component: <CompanyUserTab />,
          component: <UsersTabComponent />,
        },
      },
      {
        value: '"documentacion"',
        name: 'Documentacion',
        restricted: [''],
        tab: tabValue,
        content: {
          title: 'Documentos empresa',
          //description: 'Lista de documentos a nombre de la empresa',
          tab: tabValue,
          buttonActioRestricted: [''],
          buttonAction: (
            <div className="flex gap-4 flex-wrap ">
              <TypesDocumentAction
                EmployeesOptionsData={EmployeesOptionsData}
                VehicleOptionsData={VehicleOptionsData}
                empleadosCargados={empleadosCargados}
                equiposCargados={equiposCargados}
                role={role}
                optionChildrenProp="Empresa"
              />
            </div>
          ),
          component: <DocumentTabComponent />,
        },
      },
    ],
  };

  return (
    <div className=" ">
      <ViewcomponentInternal viewData={viewData} />
      {/* <Tabs defaultValue="company" className="w-full">
        <TabsList className="mb-2 bg-gh_contrast/50">
          <TabsTrigger className="text-gh_orange font-semibold" value="company">
            Empresa
          </TabsTrigger>
          <TabsTrigger className="text-gh_orange font-semibold" value="cost-center">
            Centro de costos
          </TabsTrigger>
          <TabsTrigger className="text-gh_orange font-semibold" value="organigrama">
            Organigrama
          </TabsTrigger>
        </TabsList>
        <TabsContent value="company" className="">
          <CompanyComponent company={companyData[0]} />
          <DangerZoneComponent />
        </TabsContent>
        <TabsContent value="cost-center" className="">
          <CostCenterTab costCenters={costCenters} />
        </TabsContent>
        <TabsContent value="organigrama">
          <OrganigramTab sectors={sectors} />
        </TabsContent>
      </Tabs> */}
    </div>
  );
}

export default General;
