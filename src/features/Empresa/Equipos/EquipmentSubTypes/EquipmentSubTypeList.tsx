import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _EquipmentSubTypeDataTable from './_EquipmentSubTypeDataTable';
import { getEquipmentSubTypesPaginated } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const EQUIPMENT_SUB_TYPE_TABLE_ID = 'equipment-sub-types';

// ============================================================================
// TYPES
// ============================================================================

interface EquipmentSubTypeListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function EquipmentSubTypeList({ searchParams, permissions }: EquipmentSubTypeListProps) {
  // Strip namespace prefix para aislar los params de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, EQUIPMENT_SUB_TYPE_TABLE_ID);

  // NO cargar facets en SSR — se cargan lazy (on-demand) en el cliente
  const [{ data, total }, preferences] = await Promise.all([
    getEquipmentSubTypesPaginated(tableParams),
    getTablePreferences(EQUIPMENT_SUB_TYPE_TABLE_ID),
  ]);

  return (
    <_EquipmentSubTypeDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={EQUIPMENT_SUB_TYPE_TABLE_ID}
      permissionsMap={permissions}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
