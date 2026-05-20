import { getUserPermissionsMapServer } from '@/features/Permissions';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { Suspense } from 'react';
import TiposList from './components/TiposList';
import { TiposSkeleton } from './fallback/TiposSkeleton';

export default async function TiposTabContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [companyId, permissionsMap] = await Promise.all([getServerCompanyId(), getUserPermissionsMapServer()]);

  return (
    <Suspense fallback={<TiposSkeleton />}>
      <TiposList searchParams={searchParams} companyId={companyId} permissionsMap={permissionsMap} />
    </Suspense>
  );
}
