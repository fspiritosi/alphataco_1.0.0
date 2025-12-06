import EmpresaComponent from '@/features/Empresa/EmpresaComponent';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = await cookies();
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

export default async function CompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <EmpresaComponent searchParams={resolvedSearchParams} />;
}
