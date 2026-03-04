import { Card, CardContent } from '@/components/ui/card';
import { checkPermissionServer } from '@/features/Permissions';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getPendingExecutionOrdersPaginated } from './actions.server';
import { _PendingExecutionDataTable } from './components/_PendingExecutionDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TABLE_ID = 'pending-execution-orders';

// ============================================================================
// TYPES
// ============================================================================

interface PendingExecutionListProps {
  searchParams: Record<string, string | string[] | undefined>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function PendingExecutionList({ searchParams }: PendingExecutionListProps) {
  // Extraer solo los params de esta tabla (quitar prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, TABLE_ID);

  const [{ data, total }, preferences, canApproveReject] = await Promise.all([
    getPendingExecutionOrdersPaginated(tableParams),
    getTablePreferences(TABLE_ID),
    checkPermissionServer('mantenimiento', 'pendientes_ejecutar', 'update'),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_PendingExecutionDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          canApproveReject={canApproveReject}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
