import RepairsSkeleton from '@/components/Skeletons/RepairsSkeleton';
import RepairTypes from '@/components/Tipos_de_reparaciones/RepairTypes';
import Viewcomponent from '@/components/ViewComponent';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
export const metadata = {
  title: 'Mantenimiento | GH Gestión',
  description: 'Página de mantenimiento de GH Gestión con información general, comercial, HR y equipos',
};

export async function generateMetadata() {
  const cookiesStore = cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Mantenimiento | ${companyName}`,
      description: `Página de mantenimiento de ${companyName} con información general, comercial, HR y equipos`,
    };
  } else {
    const companyName = await getCompanyName();
    if (companyName) {
      return {
        title: `Mantenimiento | ${companyName.company_name}`,
        description: `Página de mantenimiento de ${companyName.company_name} con información general, comercial, HR y equipos`,
      };
    }
  }
}
function MantenimientoPage({ searchParams }: { searchParams: { tab: string; subtab?: string } }) {
  const viewData = {
    defaultValue: searchParams?.tab || 'type_of_repairs',
    path: '/dashboard/maintenance',
    tabsValues: [
      {
        value: 'type_of_repairs',
        name: 'Solicitudes de mantenimiento',
        restricted: [],
        content: {
          title: 'Mantenimiento de unidades',
          description: 'Genera solicitudes de mantenimiento para tus equipos',
          buttonActioRestricted: [''],
          component: (
            <RepairTypes
              created_solicitudes
              type_of_repair
              type_of_repair_new_entry
              type_of_repair_new_entry2
              type_of_repair_new_entry3
              mechanic
              subtab={searchParams?.subtab}
              tabValue="type_of_repairs"
              path="/dashboard/maintenance"
            />
          ),
        },
      },
    ],
  };

  return (
    <Suspense fallback={<RepairsSkeleton />}>
      <div className="h-full">
        <Viewcomponent viewData={viewData} />
      </div>
    </Suspense>
  );
}

export default MantenimientoPage;
