import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getMonthlyEquipmentDocumentsPaginated } from './actions.server';
import { _MonthlyEquipmentDocumentsDataTable } from './components/_MonthlyEquipmentDocumentsDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TABLE_ID = 'monthly-equipment-documents';

// ============================================================================
// TYPES
// ============================================================================

interface MonthlyEquipmentDocumentsListProps {
  searchParams: Record<string, string | string[] | undefined>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function MonthlyEquipmentDocumentsList({ searchParams }: MonthlyEquipmentDocumentsListProps) {
  // Extraer solo los params de esta tabla (quitar prefijo)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, TABLE_ID);

  const [{ data, total }, preferences] = await Promise.all([
    getMonthlyEquipmentDocumentsPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_MonthlyEquipmentDocumentsDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
