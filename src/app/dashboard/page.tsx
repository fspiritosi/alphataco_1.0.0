import DashboardComponent from '@/components/Dashboard/DashboardComponent';
import DashboardSkeleton from '@/components/Skeletons/DashboardSkeleton';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { getRole } from '@/lib/utils/getRole';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { query } from '../server/GET/probando';
import WelcomeComponent from './welcome-component';

export default async function Home() {
  // Mover las consultas dentro de la función del componente para evitar errores durante el build
  // const data = await query('employees', '*');
  const role = await getRole();
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {!role && <DashboardSkeleton />}
      {role === 'Invitado' && typeof role === 'string' ? <WelcomeComponent /> : <DashboardComponent />}
    </Suspense>
  );
}

// Exportar el tipo basado en una consulta de ejemplo
export type dataType = Awaited<ReturnType<typeof query<'employees', '*'>>>;

// Generate metadata for the page
export async function generateMetadata() {
  const cookiesStore = cookies();
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
