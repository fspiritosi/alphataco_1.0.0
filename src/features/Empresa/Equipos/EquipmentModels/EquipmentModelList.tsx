import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _EquipmentModelDataTable from './_EquipmentModelDataTable';
import { getEquipmentModelsPaginated } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const EQUIPMENT_MODEL_TABLE_ID = 'equipment-models';

// ============================================================================
// TYPES
// ============================================================================

interface EquipmentModelListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function EquipmentModelList({ searchParams, permissions }: EquipmentModelListProps) {
  // Strip namespace prefix para aislar los params de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, EQUIPMENT_MODEL_TABLE_ID);

  // NO cargar facets en SSR — se cargan lazy (on-demand) en el cliente
  const [{ data, total }, preferences] = await Promise.all([
    getEquipmentModelsPaginated(tableParams),
    getTablePreferences(EQUIPMENT_MODEL_TABLE_ID),
  ]);

  return (
    <_EquipmentModelDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={EQUIPMENT_MODEL_TABLE_ID}
      permissionsMap={permissions}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
