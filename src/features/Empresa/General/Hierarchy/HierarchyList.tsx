import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _HierarchyDataTable from './_HierarchyDataTable';
import { getHierarchiesPaginated } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const HIERARCHY_TABLE_ID = 'hierarchy';

// ============================================================================
// TYPES
// ============================================================================

interface HierarchyListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function HierarchyList({ searchParams, permissions }: HierarchyListProps) {
  // Strip namespace prefix para aislar los params de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, HIERARCHY_TABLE_ID);

  // NO cargar facets en SSR — se cargan lazy (on-demand) en el cliente
  const [{ data, total }, preferences] = await Promise.all([
    getHierarchiesPaginated(tableParams),
    getTablePreferences(HIERARCHY_TABLE_ID),
  ]);

  return (
    <_HierarchyDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={HIERARCHY_TABLE_ID}
      permissionsMap={permissions}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
