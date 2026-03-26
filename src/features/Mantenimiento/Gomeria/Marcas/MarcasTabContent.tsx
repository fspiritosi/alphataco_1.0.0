import { getUserPermissionsMapServer } from '@/features/Permissions';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { Suspense } from 'react';
import MarcasList from './components/MarcasList';
import { MarcasSkeleton } from './fallback/MarcasSkeleton';

export default async function MarcasTabContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [companyId, permissionsMap] = await Promise.all([getServerCompanyId(), getUserPermissionsMapServer()]);

  return (
    <Suspense fallback={<MarcasSkeleton />}>
      <MarcasList searchParams={searchParams} companyId={companyId} permissionsMap={permissionsMap} />
    </Suspense>
  );
}
