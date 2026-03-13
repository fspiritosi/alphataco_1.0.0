import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _CostCenterDataTable from './_CostCenterDataTable';
import { getCostCentersPaginated } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const COST_CENTER_TABLE_ID = 'cost-centers';

// ============================================================================
// TYPES
// ============================================================================

interface CostCenterListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function CostCenterList({ searchParams, permissions }: CostCenterListProps) {
  // Strip namespace prefix para aislar los params de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, COST_CENTER_TABLE_ID);

  // NO cargar facets en SSR — se cargan lazy (on-demand) en el cliente
  const [{ data, total }, preferences] = await Promise.all([
    getCostCentersPaginated(tableParams),
    getTablePreferences(COST_CENTER_TABLE_ID),
  ]);

  return (
    <_CostCenterDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={COST_CENTER_TABLE_ID}
      permissionsMap={permissions}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
