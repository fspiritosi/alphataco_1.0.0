import RepairTypes from '@/components/Tipos_de_reparaciones/RepairTypes';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { getUserPermissionsMapServer } from '@/features/Permissions/actionsServer';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = await cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Mantenimiento | ${companyName}`,
      description: `Gestión de mantenimiento y solicitudes de reparación de ${companyName}`,
    };
  } else {
    const actualCompany = await getCompanyName();
    if (actualCompany) {
      return {
        title: `Mantenimiento | ${actualCompany.company_name}`,
        description: `Gestión de mantenimiento y solicitudes de reparación de ${actualCompany.company_name}`,
      };
    }
  }
}

export default async function MantenimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const permissions = await getUserPermissionsMapServer();
  const resolvedSearchParams = await searchParams;

  return (
    <div>
      <RepairTypes mechanic searchParams={resolvedSearchParams} moduleSlug="mantenimiento" permissions={permissions} />
    </div>
  );
}
