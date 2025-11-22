import ComercialComponent from '@/features/Comercial/ComercialComponent';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Comercial | ${companyName}`,
      description: `Página de comercial de ${companyName} con clientes, áreas, equipos y contratos`,
    };
  } else {
    const actualCompany = await getCompanyName();
    if (actualCompany) {
      return {
        title: `Comercial | ${actualCompany.company_name}`,
        description: `Página de comercial de ${actualCompany.company_name} con clientes, áreas, equipos y contratos`,
      };
    }
  }
}

export default function ComercialPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return <ComercialComponent searchParams={searchParams} />;
}
