import { Card, CardContent } from '@/components/ui/card';
import { checkPermissionServer } from '@/features/Permissions';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getConfirmedOrdersPaginated } from './actions.server';
import { _ConfirmedOrderDataTable } from './components/_ConfirmedOrderDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TABLE_ID = 'pedidos-confirmados';

// ============================================================================
// TYPES
// ============================================================================

interface ConfirmedOrderListProps {
  searchParams: Record<string, string | string[] | undefined>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function ConfirmedOrderList({ searchParams }: ConfirmedOrderListProps) {
  // Extraer solo los params de esta tabla (quitar prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, TABLE_ID);

  const [{ data, total }, preferences, canApproveWorkshopEntry] = await Promise.all([
    getConfirmedOrdersPaginated(tableParams),
    getTablePreferences(TABLE_ID),
    checkPermissionServer('mantenimiento', 'pedidos_confirmados', 'update'),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_ConfirmedOrderDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          canApproveWorkshopEntry={canApproveWorkshopEntry}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
