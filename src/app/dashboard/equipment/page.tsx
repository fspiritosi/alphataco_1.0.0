import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import EquiposComponent from '@/features/Equipos/EquiposComponent';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Equipos | ${companyName}`,
      description: `Página de equipos de ${companyName} con información general, comercial, HR y equipos`,
    };
  } else {
    const actualCompany = await getCompanyName();
    if (actualCompany) {
      return {
        title: `Equipos | ${actualCompany.company_name}`,
        description: `Página de equipos de ${actualCompany.company_name} con información general, comercial, HR y equipos`,
      };
    }
  }
}

export default function Equipment({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return <EquiposComponent searchParams={searchParams} />;
}
