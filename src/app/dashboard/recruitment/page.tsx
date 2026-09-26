import SeleccionComponent from '@/features/Seleccion/SeleccionComponent';
import { getCompanyName } from '@/features/Empresa/General/actions/company.server';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = await cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return { title: `Selección | ${companyName}`, description: `Selección de personal de ${companyName}` };
  }
  const actualCompany = await getCompanyName();
  if (actualCompany) {
    return {
      title: `Selección | ${actualCompany.company_name}`,
      description: `Selección de personal de ${actualCompany.company_name}`,
    };
  }
  return { title: 'Selección' };
}

export default async function RecruitmentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <SeleccionComponent searchParams={resolvedSearchParams} />;
}
