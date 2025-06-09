import {
  fetchAllDocumentTypes,
  fetchAllEmployeesWithRelations,
  fetchAllEquipmentWithRelations,
} from '@/app/server/GET/actions';
import DocumentNav from '@/components/DocumentNav';
import PageTableSkeleton from '@/components/Skeletons/PageTableSkeleton';
import Viewcomponent from '@/components/ViewComponent';
import { supabaseServer } from '@/lib/supabase/server';
import { CompanyDocumentsType } from '@/store/loggedUser';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import CompanyTabs from './documentComponents/CompanyTabs';
import EmployeeDocumentsTabs from './documentComponents/EmployeeDocumentsTabs';
import EquipmentTabs from './documentComponents/EquipmentTabs';
import { setEmployeeDataOptions, setVehicleDataOptions } from './documentComponents/TypesDocumentAction';

export default async function page({
  params,
}: {
  params: {
    tab: string;
    subtab: string;
  };
}) {
  const supabase = supabaseServer();
  const user = await supabase.auth.getUser();
  const URL = process.env.NEXT_PUBLIC_BASE_URL;
  const cookiesStore = cookies();
  const { data: userShared } = await supabase
    .from('share_company_users')
    .select('*')
    .eq('profile_id', user?.data?.user?.id || '');
  const role: string | null = userShared?.[0]?.role || null;
  const actualCompany = cookiesStore.get('actualComp')?.value;

  let { data: documents_company, error: documents_company_error } = await supabase
    .from('documents_company')
    .select('*,id_document_types(*),user_id(*)')
    .eq('applies', actualCompany || '');

  const typedDataCompany: CompanyDocumentsType[] | null = documents_company as CompanyDocumentsType[] | null;

  const companyData =
    role === 'Invitado' ? typedDataCompany?.filter((e) => !e.id_document_types.private) : typedDataCompany;

  const EmployeesOptionsData = await setEmployeeDataOptions();
  const VehicleOptionsData = await setVehicleDataOptions();

  const empleadosCargados = await fetchAllEmployeesWithRelations();
  const equiposCargados = await fetchAllEquipmentWithRelations();

  const documentTypes = await fetchAllDocumentTypes();

  const savedVisibility = cookiesStore.get(`document_type_employees`)?.value;
  const savedFilters = cookiesStore.get(`document_type_employees-filters`)?.value;

  const viewData = {
    defaultValue: params.tab || 'Documentos de empleados',
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
            <CompanyTabs
              path="/dashboard/document"
              tabValue="Documentos de empresa"
              subtab={params.subtab}
              companyData={companyData as any}
            />
          ),
        },
      },
      // {
      //   value: 'Tipos de documentos',
      //   name: 'Tipos de documentos',
      //   restricted: ['Invitado'],
      //   content: {
      //     title: 'Tipos de documentos',
      //     description: 'Tipos de documentos auditables',
      //     buttonActioRestricted: [''],
      //     buttonAction: (
      //       <TypesDocumentAction
      //         optionChildrenProp="all"
      //         EmployeesOptionsData={EmployeesOptionsData}
      //         VehicleOptionsData={VehicleOptionsData}
      //         empleadosCargados={empleadosCargados}
      //         equiposCargados={equiposCargados}
      //         role={role || ''}
      //       />
      //     ),
      //     component: (
      //       <TypesDocumentsView
      //         optionChildrenProp="all"
      //         equipos
      //         savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : undefined}
      //         savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      //         empresa
      //         personas
      //         employeeMockValues={EmployeesOptionsData}
      //         vehicleMockValues={VehicleOptionsData}
      //         employees={empleadosCargados}
      //         vehicles={equiposCargados}
      //         document_types={documentTypes}
      //       />
      //     ),
      //   },
      // },
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

  return (
    <Suspense fallback={<PageTableSkeleton />}>
      <Viewcomponent viewData={viewData} />
    </Suspense>
  );
}
