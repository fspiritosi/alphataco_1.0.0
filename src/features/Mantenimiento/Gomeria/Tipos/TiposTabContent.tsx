import { getUserPermissionsMapServer } from '@/features/Permissions';
import { Suspense } from 'react';
import TiposList from './components/TiposList';
import { TiposSkeleton } from './fallback/TiposSkeleton';

export default async function TiposTabContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const permissionsMap = await getUserPermissionsMapServer();

  return (
    <Suspense fallback={<TiposSkeleton />}>
      <TiposList searchParams={searchParams} permissionsMap={permissionsMap} />
    </Suspense>
  );
}
