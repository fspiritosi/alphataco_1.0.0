import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getOtherEquipmentPaginated } from './actions.server';
import { _OtherEquipmentDataTable } from './components/_OtherEquipmentDataTable';

// ============================================================================
// TYPES
// ============================================================================

interface OtherEquipmentListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function OtherEquipmentList({ searchParams, permissions }: OtherEquipmentListProps) {
  const tableId = 'other-equipment';

  // Extraer solo los params de esta tabla (quitar prefijo)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, tableId);

  const [{ data, total }, preferences] = await Promise.all([
    getOtherEquipmentPaginated(tableParams),
    getTablePreferences(tableId),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_OtherEquipmentDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={tableId}
          permissionsMap={permissions}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
