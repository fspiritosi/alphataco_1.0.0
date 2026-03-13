import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getPersonasDocTypesPaginated } from '../actions/actions.server';
import _PersonasDataTable from './_PersonasDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_ID = 'doc-types-personas';

// ============================================================================
// TYPES
// ============================================================================

interface PersonasListProps {
  searchParams: DataTableSearchParams;
  permissionsMap?: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function PersonasList({ searchParams, permissionsMap }: PersonasListProps) {
  // Extraer solo los params de esta tabla (quitar prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  // Facets se cargan lazy (on-demand al abrir cada popover) — no en SSR
  const [{ data, total }, preferences] = await Promise.all([
    getPersonasDocTypesPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_PersonasDataTable
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
