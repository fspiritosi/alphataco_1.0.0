import { getUserPermissionsMapServer } from '@/features/Permissions';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { Suspense } from 'react';
import TemplatesList from './TemplatesList';
import { PlantillasSkeleton } from './fallback/PlantillasSkeleton';

export default async function PlantillasTabContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [companyId, permissionsMap] = await Promise.all([getServerCompanyId(), getUserPermissionsMapServer()]);

  return (
    <div className="space-y-6">
      <Suspense fallback={<PlantillasSkeleton />}>
        <TemplatesList searchParams={searchParams} companyId={companyId} permissionsMap={permissionsMap} />
      </Suspense>
    </div>
  );
}
