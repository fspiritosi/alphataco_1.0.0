import DashboardComponent from '@/components/Dashboard/DashboardComponent';
import DashboardSkeleton from '@/components/Skeletons/DashboardSkeleton';
import { getRole } from '@/lib/utils/getRole';
import { Suspense } from 'react';
import { query, queryPaginated } from '../server/GET/probando';
import WelcomeComponent from './welcome-component';

export default async function Home() {
  // Mover las consultas dentro de la función del componente para evitar errores durante el build
  const data = await query('employees', '*');
  const activeEmployees = await query('employees', '*', [{ column: 'is_active', operator: 'eq', value: true }]);
  const paginatedResult = await queryPaginated('employees', 'id', {
    page: 1,
    pageSize: 20,
    filters: [{ column: 'is_active', value: true }],
    orderBy: 'id',
    ascending: true,
  });

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
