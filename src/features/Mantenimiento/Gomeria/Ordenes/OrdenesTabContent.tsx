import { getUserPermissionsMapServer } from '@/features/Permissions';
import { Suspense } from 'react';
import ServiceOrdersList from './ServiceOrdersList';
import { OrdenesSkeleton } from './fallback/OrdenesSkeleton';

export default async function OrdenesTabContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const permissionsMap = await getUserPermissionsMapServer();

  return (
    <Suspense fallback={<OrdenesSkeleton />}>
      <ServiceOrdersList searchParams={searchParams} permissionsMap={permissionsMap} />
    </Suspense>
  );
}
