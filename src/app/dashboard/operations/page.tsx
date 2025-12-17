import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import OperacionesComponent from '@/features/Operaciones/OperacionesComponent';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = await cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Operaciones | ${companyName}`,
      description: `Gestión de operaciones y partes diarios de ${companyName}`,
    };
  } else {
    const actualCompany = await getCompanyName();
    if (actualCompany) {
      return {
        title: `Operaciones | ${actualCompany.company_name}`,
        description: `Gestión de operaciones y partes diarios de ${actualCompany.company_name}`,
      };
    }
  }
}

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <OperacionesComponent searchParams={resolvedSearchParams} />;
}
