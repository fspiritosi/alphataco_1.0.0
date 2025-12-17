import DashboardComponent from '@/features/Dashboard/DashboardComponent';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { cookies } from 'next/headers';
import { query } from '../server/GET/probando';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <DashboardComponent searchParams={resolvedSearchParams} />;
}

// Exportar el tipo basado en una consulta de ejemplo
export type dataType = Awaited<ReturnType<typeof query<'employees', '*'>>>;

// Generate metadata for the page
export async function generateMetadata() {
  const cookiesStore = await cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Dashboard | ${companyName}`,
      description: `Dashboard principal de ${companyName} con métricas y estadísticas clave`,
    };
  } else {
    const actualCompany = await getCompanyName();
    if (actualCompany) {
      return {
        title: `Dashboard | ${actualCompany.company_name}`,
        description: `Dashboard principal de ${actualCompany.company_name} con métricas y estadísticas clave`,
      };
    }
  }
}
