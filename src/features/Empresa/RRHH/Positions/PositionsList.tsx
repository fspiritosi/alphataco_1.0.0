import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _PositionsDataTable from './_PositionsDataTable';
import { getPositionsPaginated } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const POSITIONS_TABLE_ID = 'positions';

// ============================================================================
// TYPES
// ============================================================================

interface PositionsListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function PositionsList({ searchParams, permissions }: PositionsListProps) {
  // Strip namespace prefix para aislar los params de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, POSITIONS_TABLE_ID);

  // NO cargar facets en SSR — se cargan lazy (on-demand) en el cliente
  const [{ data, total }, preferences] = await Promise.all([
    getPositionsPaginated(tableParams),
    getTablePreferences(POSITIONS_TABLE_ID),
  ]);

  return (
    <_PositionsDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={POSITIONS_TABLE_ID}
      permissionsMap={permissions}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
