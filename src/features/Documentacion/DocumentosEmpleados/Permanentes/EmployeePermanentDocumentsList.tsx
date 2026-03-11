import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getEmployeePermanentDocumentsPaginated } from './actions.server';
import { _EmployeePermanentDocumentsDataTable } from './components/_EmployeePermanentDocumentsDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TABLE_ID = 'employee-permanent-docs';

// ============================================================================
// TYPES
// ============================================================================

interface EmployeePermanentDocumentsListProps {
  searchParams: Record<string, string | string[] | undefined>;
  /** Si se provee, filtra documentos de un empleado específico (vista de detalle) */
  employeeId?: string;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function EmployeePermanentDocumentsList({ searchParams, employeeId }: EmployeePermanentDocumentsListProps) {
  // Extraer solo los params de esta tabla (quitar prefijo)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, TABLE_ID);

  const [{ data, total }, preferences] = await Promise.all([
    getEmployeePermanentDocumentsPaginated(tableParams, employeeId),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_EmployeePermanentDocumentsDataTable
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
