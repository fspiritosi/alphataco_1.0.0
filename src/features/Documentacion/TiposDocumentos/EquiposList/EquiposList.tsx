import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getEquiposDocTypesPaginated } from '../actions/queries.server';
import _EquiposDataTable from './_EquiposDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_ID = 'doc-types-equipos';

// ============================================================================
// TYPES
// ============================================================================

interface EquiposListProps {
  searchParams: DataTableSearchParams;
  permissionsMap?: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function EquiposList({ searchParams, permissionsMap }: EquiposListProps) {
  // Extraer solo los params de esta tabla (quitar prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  // Facets se cargan lazy (on-demand al abrir cada popover) — no en SSR
  const [{ data, total }, preferences] = await Promise.all([
    getEquiposDocTypesPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_EquiposDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
          permissionsMap={permissionsMap}
        />
      </CardContent>
    </Card>
  );
}
