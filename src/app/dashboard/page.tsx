import DashboardComponent from '@/components/Dashboard/DashboardComponent';
import DashboardSkeleton from '@/components/Skeletons/DashboardSkeleton';
import { getRole } from '@/lib/utils/getRole';
import { Suspense } from 'react';
import { query } from '../server/GET/probando';
import WelcomeComponent from './welcome-component';
export const metadata = {
  title: 'Dashboard | GH Gestión',
  description: 'Dashboard principal de GH Gestión con métricas y estadísticas clave',
};

export default async function Home() {
  // Mover las consultas dentro de la función del componente para evitar errores durante el build
  const data = await query('employees', '*');
  const role = await getRole();
  return (
    <Suspense fallback={<DashboardSkeleton data={data} />}>
      {!role && <DashboardSkeleton data={data} />}
      {role === 'Invitado' && typeof role === 'string' ? <WelcomeComponent /> : <DashboardComponent />}
    </Suspense>
  );
}

// Exportar el tipo basado en una consulta de ejemplo
export type dataType = Awaited<ReturnType<typeof query<'employees', '*'>>>;
