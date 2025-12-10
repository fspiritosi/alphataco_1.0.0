import { cookies } from 'next/headers';
import { KpisTabClient } from './KpisTabClient';
import { fetchAllKPIs } from './actions/actions';

export default async function KpisTabContent({
  searchParams,
  permissions,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  permissions: Record<string, boolean>;
}) {
  const kpis = fetchAllKPIs();
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get('kpis-table')?.value;
  const savedFilter = cookiesStore.get('kpis-table-filters')?.value;

  return (
    <KpisTabClient
      kpis={kpis}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
    />
  );
}
