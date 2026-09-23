import { getUserPermissionsMapServer } from '@/features/Permissions';
import { Suspense } from 'react';
import MarcasList from './components/MarcasList';
import { MarcasSkeleton } from './fallback/MarcasSkeleton';

export default async function MarcasTabContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const permissionsMap = await getUserPermissionsMapServer();

  return (
    <Suspense fallback={<MarcasSkeleton />}>
      <MarcasList searchParams={searchParams} permissionsMap={permissionsMap} />
    </Suspense>
  );
}
