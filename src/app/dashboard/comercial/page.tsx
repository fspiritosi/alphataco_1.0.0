import ComercialComponent from '@/features/Comercial/ComercialComponent';
import { getCompanyName } from '@/features/Empresa/General/actions/company.server';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = await cookies();
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

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <ComercialComponent searchParams={resolvedSearchParams} />;
}
