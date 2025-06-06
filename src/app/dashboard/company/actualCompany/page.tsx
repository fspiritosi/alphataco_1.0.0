import Viewcomponent from '@/components/ViewComponent';
import { buttonVariants } from '@/components/ui/button';
import General from '@/features/Empresa/General/General';
import RrhhComponent from '@/features/Empresa/RRHH/components/rrhh/rrhhComponent';
import Link from 'next/link';
// import Customers from '../../../../features/Empresa/Clientes/Customers';
import ComercialTab from '@/features/Empresa/Clientes/ComercialTab';
import EquipmentsTabs from '@/features/Empresa/Equipos/equipmentsTabs';

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
          component: (
            // <Suspense fallback={<Skeleton />}>
            <General tabValue="general" subtab={searchParams?.subtab} />
            // </Suspense>
          ),
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
            // <Suspense fallback={<Skeleton />}>
            <ComercialTab tabValue="comerce" subtab={searchParams?.subtab} localStorageName="customersColumns" />
            // </Suspense>
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
          component: (
            // <Suspense fallback={<Skeleton />}>
            <RrhhComponent tabValue="rrhh" subtab={searchParams?.subtab} />
            // </Suspense>
          ),
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
          component: (
            // <Suspense fallback={<Skeleton />}>
            <EquipmentsTabs />
            // </Suspense>
          ),
        },
      },
    ],
  };

  return (
    // <Suspense fallback={<CompanySkeleton />}>
    <Viewcomponent viewData={viewData} />
    // </Suspense>
  );
}
