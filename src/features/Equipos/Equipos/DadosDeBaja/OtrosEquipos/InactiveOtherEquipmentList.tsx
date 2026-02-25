import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getInactiveOtherEquipmentPaginated } from './actions/actions.server';
import { _InactiveOtherEquipmentDataTable } from './components/_InactiveOtherEquipmentDataTable';

// ============================================================================
// TYPES
// ============================================================================

interface InactiveOtherEquipmentListProps {
  searchParams: Record<string, string | string[] | undefined>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function InactiveOtherEquipmentList({ searchParams }: InactiveOtherEquipmentListProps) {
  const tableId = 'inactive-other-equipment';

  const [{ data, total }, preferences] = await Promise.all([
    getInactiveOtherEquipmentPaginated(searchParams as DataTableSearchParams),
    getTablePreferences(tableId),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_InactiveOtherEquipmentDataTable
          data={data}
          totalRows={total}
          searchParams={searchParams as DataTableSearchParams}
          tableId={tableId}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
