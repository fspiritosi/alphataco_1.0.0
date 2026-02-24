import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
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

  const [{ data, total }, preferences] = await Promise.all([
    getOtherEquipmentPaginated(searchParams as DataTableSearchParams),
    getTablePreferences(tableId),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_OtherEquipmentDataTable
          data={data}
          totalRows={total}
          searchParams={searchParams as DataTableSearchParams}
          tableId={tableId}
          permissionsMap={permissions}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
