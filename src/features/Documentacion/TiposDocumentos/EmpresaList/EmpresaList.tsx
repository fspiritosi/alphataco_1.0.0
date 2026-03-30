import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getEmpresaDocTypesPaginated } from '../actions/actions.server';
import _EmpresaDataTable from './_EmpresaDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_ID = 'doc-types-empresa';

// ============================================================================
// TYPES
// ============================================================================

interface EmpresaListProps {
  searchParams: DataTableSearchParams;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function EmpresaList({ searchParams }: EmpresaListProps) {
  // Extraer solo los params de esta tabla (quitar prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  // Facets se cargan lazy (on-demand al abrir cada popover) — no en SSR
  const [{ data, total }, preferences] = await Promise.all([
    getEmpresaDocTypesPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_EmpresaDataTable
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
