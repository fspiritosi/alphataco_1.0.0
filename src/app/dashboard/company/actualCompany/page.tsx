import { buttonVariants } from '@/components/ui/button';
import Viewcomponent from '@/components/ViewComponent';
import ComercialTab from '@/features/Empresa/Clientes/ComercialTab';
import EquipmentsTabs from '@/features/Empresa/Equipos/equipmentsTabs';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import General from '@/features/Empresa/General/General';
import RrhhComponent from '@/features/Empresa/RRHH/components/rrhh/rrhhComponent';
import { cookies } from 'next/headers';
import Link from 'next/link';

export async function generateMetadata() {
  const cookiesStore = cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Empresa | ${companyName}`,
      description: `Página de empresa de ${companyName} con información general, comercial, HR y equipos`,
    };
  } else {
    const actualCompany = await getCompanyName();
    if (actualCompany) {
      return {
        title: `Empresa | ${actualCompany.company_name}`,
        description: `Página de empresa de ${actualCompany.company_name} con información general, comercial, HR y equipos`,
      };
    }
  }
}

export default async function CompanyPage({ searchParams }: { searchParams: { tab: string; subtab?: string } }) {
  const viewData = {
    defaultValue: searchParams?.tab || 'general',
    path: '/dashboard/company/actualCompany',
    tabsValues: [
      {
        value: 'general',
        name: 'General',
        restricted: [''],
        content: {
          title: 'Empresa',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <General tabValue="general" subtab={searchParams?.subtab} />,
        },
      },
      {
        value: 'comerce',
        name: 'Comercial',
        restricted: [''],
        content: {
          title: 'Comercial',
          buttonActioRestricted: [''],
          buttonAction: (
            <Link
              href={'/dashboard/company/actualCompany/customers/action?action=new'}
              className={buttonVariants({ variant: 'gh_orange', size: 'sm', className: 'font-semibold' })}
            >
              Registrar Cliente
            </Link>
          ),
          component: (
            <ComercialTab tabValue="comerce" subtab={searchParams?.subtab} localStorageName="customersColumns" />
          ),
        },
      },

      {
        value: 'rrhh',
        name: 'RRHH',
        restricted: [''],
        content: {
          title: 'RRHH',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <RrhhComponent tabValue="rrhh" subtab={searchParams?.subtab} />,
        },
      },
      {
        value: 'vehicles',
        name: 'Equipos',
        restricted: [''],
        content: {
          title: 'Equipos',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <EquipmentsTabs tabValue="vehicles" />,
        },
      },
    ],
  };

  return <Viewcomponent viewData={viewData} />;
}
