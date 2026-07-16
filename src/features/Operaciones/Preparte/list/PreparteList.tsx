import { fetchAllContracts } from '@/features/Equipos/EquipoID/actions/vehicle-actions';
import { fetchCustomersWithRelations } from '@/features/Operaciones/Preparte/actions/actions';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { PreparteManager } from '../components/PreparteManager';
import { StatusCardsServerContainer } from '../components/StatusCardsServerContainer';
import { getPrepartesPaginated } from './actions.server';

interface Props {
  searchParams: DataTableSearchParams;
  permissionsMap: Record<string, boolean>;
}

export const PREPARTE_TABLE_ID = 'preparte-table';

export async function PreparteList({ searchParams, permissionsMap }: Props) {
  const tableParams = stripPrefixFromSearchParams(searchParams, PREPARTE_TABLE_ID);

  const [{ data, total }, preferences, customers, contracts] = await Promise.all([
    getPrepartesPaginated(tableParams),
    getTablePreferences(PREPARTE_TABLE_ID),
    fetchCustomersWithRelations(),
    fetchAllContracts(),
  ]);

  return (
    <PreparteManager
      Customers={customers}
      contratos={contracts}
      prepartes={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={PREPARTE_TABLE_ID}
      permissionsMap={permissionsMap}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
      statusCards={<StatusCardsServerContainer />}
    />
  );
}
