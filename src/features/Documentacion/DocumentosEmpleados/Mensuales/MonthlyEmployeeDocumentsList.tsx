import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getMonthlyEmployeeDocumentsPaginated } from './actions.server';
import { _MonthlyEmployeeDocumentsDataTable } from './components/_MonthlyEmployeeDocumentsDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TABLE_ID = 'monthly-employee-documents';

// ============================================================================
// TYPES
// ============================================================================

interface MonthlyEmployeeDocumentsListProps {
  searchParams: Record<string, string | string[] | undefined>;
  employeeId?: string;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function MonthlyEmployeeDocumentsList({ searchParams, employeeId }: MonthlyEmployeeDocumentsListProps) {
  // Extraer solo los params de esta tabla (quitar prefijo)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, TABLE_ID);

  const [{ data, total }, preferences] = await Promise.all([
    getMonthlyEmployeeDocumentsPaginated(tableParams, employeeId),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_MonthlyEmployeeDocumentsDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
          employeeId={employeeId}
        />
      </CardContent>
    </Card>
  );
}
