import { getCompanyName } from '@/features/Empresa/General/actions/company.server';
import EquiposComponent from '@/features/Equipos/EquiposComponent';
import { getUserPermissionsMapServer } from '@/features/Permissions';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = await cookies();
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

export default async function Equipment({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Obtener permisos en el servidor (sin caché, datos frescos en cada petición)
  const permissions = await getUserPermissionsMapServer();
  const resolvedSearchParams = await searchParams;

  return <EquiposComponent searchParams={resolvedSearchParams} permissions={permissions} />;
}
