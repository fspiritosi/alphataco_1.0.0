import { getUserPermissionsMapServer } from '@/features/Permissions';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { Suspense } from 'react';
import TiresList from './TiresList';
import { CatalogoSkeleton } from './fallback/CatalogoSkeleton';

export default async function CatalogoTabContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [companyId, permissionsMap] = await Promise.all([getServerCompanyId(), getUserPermissionsMapServer()]);

  return (
    <Suspense fallback={<CatalogoSkeleton />}>
      <TiresList searchParams={searchParams} companyId={companyId} permissionsMap={permissionsMap} />
    </Suspense>
  );
}
