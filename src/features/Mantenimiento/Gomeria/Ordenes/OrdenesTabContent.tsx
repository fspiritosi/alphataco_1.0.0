import { getUserPermissionsMapServer } from '@/features/Permissions';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { Suspense } from 'react';
import ServiceOrdersList from './ServiceOrdersList';
import { OrdenesSkeleton } from './fallback/OrdenesSkeleton';

export default async function OrdenesTabContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [companyId, permissionsMap] = await Promise.all([getServerCompanyId(), getUserPermissionsMapServer()]);

  return (
    <Suspense fallback={<OrdenesSkeleton />}>
      <ServiceOrdersList searchParams={searchParams} companyId={companyId} permissionsMap={permissionsMap} />
    </Suspense>
  );
}
