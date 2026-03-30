import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _EquipmentTypeDataTable from './_EquipmentTypeDataTable';
import { getAllActiveTypes, getEquipmentTypesPaginated } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const EQUIPMENT_TYPE_TABLE_ID = 'equipment-types';

// ============================================================================
// TYPES
// ============================================================================

interface EquipmentTypeListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function EquipmentTypeList({ searchParams, permissions }: EquipmentTypeListProps) {
  // Strip namespace prefix para aislar los params de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, EQUIPMENT_TYPE_TABLE_ID);

  // NO cargar facets en SSR — se cargan lazy (on-demand) en el cliente
  const [{ data, total }, preferences, allActiveTypes] = await Promise.all([
    getEquipmentTypesPaginated(tableParams),
    getTablePreferences(EQUIPMENT_TYPE_TABLE_ID),
    getAllActiveTypes(),
  ]);

  return (
    <_EquipmentTypeDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={EQUIPMENT_TYPE_TABLE_ID}
      permissionsMap={permissions}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
      allActiveTypes={allActiveTypes}
    />
  );
}
