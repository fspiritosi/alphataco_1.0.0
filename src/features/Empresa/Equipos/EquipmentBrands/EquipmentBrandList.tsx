import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _EquipmentBrandDataTable from './_EquipmentBrandDataTable';
import { getEquipmentBrandsPaginated } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const EQUIPMENT_BRAND_TABLE_ID = 'equipment-brands';

// ============================================================================
// TYPES
// ============================================================================

interface EquipmentBrandListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function EquipmentBrandList({ searchParams, permissions }: EquipmentBrandListProps) {
  // Strip namespace prefix para aislar los params de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, EQUIPMENT_BRAND_TABLE_ID);

  // NO cargar facets en SSR — se cargan lazy (on-demand) en el cliente
  const [{ data, total }, preferences] = await Promise.all([
    getEquipmentBrandsPaginated(tableParams),
    getTablePreferences(EQUIPMENT_BRAND_TABLE_ID),
  ]);

  return (
    <_EquipmentBrandDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={EQUIPMENT_BRAND_TABLE_ID}
      permissionsMap={permissions}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
