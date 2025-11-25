import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import OperacionesComponent from '@/features/Operaciones/OperacionesComponent';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = cookies();
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

export default function OperationsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return <OperacionesComponent searchParams={searchParams} />;
}
