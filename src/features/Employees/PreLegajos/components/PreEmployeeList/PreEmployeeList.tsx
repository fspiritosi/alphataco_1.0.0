import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getPreEmployeesPaginated } from './actions.server';
import { _PreEmployeeDataTable } from './components/_PreEmployeeDataTable';

// ============================================================================
// TYPES
// ============================================================================

interface PreEmployeeListProps {
  searchParams: DataTableSearchParams;
}

const TABLE_ID = 'pre-employees';

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function PreEmployeeList({ searchParams }: PreEmployeeListProps) {
  // Extraer solo los params de esta tabla (quitar prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  // Los facets se cargan lazy (on-demand al abrir cada popover) — no en SSR
  const [{ data, total }, preferences] = await Promise.all([
    getPreEmployeesPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_PreEmployeeDataTable
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
