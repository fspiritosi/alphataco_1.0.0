import { buttonVariants } from '@/components/ui/button';
import Viewcomponent from '@/components/ViewComponent';
import ComercialTab from '@/features/Empresa/Clientes/ComercialTab';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
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
        title: `Comercial | ${actualCompany.company_name}`,
        description: `Página de comercial de ${actualCompany.company_name} con información general, comercial, HR y equipos`,
      };
    }
  }
}

export default async function CompanyPage({ searchParams }: { searchParams: { tab: string; subtab?: string } }) {
  const viewData = {
    defaultValue: searchParams?.tab || 'comerce',
    path: '/dashboard/comercial',
    tabsValues: [
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
    ],
  };

  return <Viewcomponent viewData={viewData} />;
}
