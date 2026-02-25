import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getDailyReportsPaginated } from './actions.server';
import { _DailyReportDataTable } from './components/_DailyReportDataTable';

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  searchParams: DataTableSearchParams;
  permissionsMap: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

const TABLE_ID = 'daily-reports';

export async function DailyReportList({ searchParams, permissionsMap }: Props) {
  // Extraer solo los params de esta tabla (quitar prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  const [{ data, total }, preferences] = await Promise.all([
    getDailyReportsPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <_DailyReportDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={TABLE_ID}
      permissionsMap={permissionsMap}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
