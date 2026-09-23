import { getUserPermissionsMapServer } from '@/features/Permissions';
import { Suspense } from 'react';
import TiresList from './TiresList';
import { CatalogoSkeleton } from './fallback/CatalogoSkeleton';

export default async function CatalogoTabContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const permissionsMap = await getUserPermissionsMapServer();

  return (
    <Suspense fallback={<CatalogoSkeleton />}>
      <TiresList searchParams={searchParams} permissionsMap={permissionsMap} />
    </Suspense>
  );
}
