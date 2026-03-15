import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _DiagramTypeDataTable from './_DiagramTypeDataTable';
import { getDiagramTypesPaginated } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const DIAGRAM_TYPE_TABLE_ID = 'diagram-types';

// ============================================================================
// TYPES
// ============================================================================

interface DiagramTypeListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function DiagramTypeList({ searchParams, permissions }: DiagramTypeListProps) {
  // Strip namespace prefix para aislar los params de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, DIAGRAM_TYPE_TABLE_ID);

  // NO cargar facets en SSR — se cargan lazy (on-demand) en el cliente
  const [{ data, total }, preferences] = await Promise.all([
    getDiagramTypesPaginated(tableParams),
    getTablePreferences(DIAGRAM_TYPE_TABLE_ID),
  ]);

  return (
    <_DiagramTypeDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={DIAGRAM_TYPE_TABLE_ID}
      permissionsMap={permissions}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
