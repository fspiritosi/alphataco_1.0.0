import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getClothingItemsPaginated } from './actions.server';
import _ClothingItemsDataTable from './components/_ClothingItemsDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_ID = 'clothing-items';

// ============================================================================
// TYPES
// ============================================================================

interface ClothingItemsListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissionsMap: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function ClothingItemsList({ searchParams, permissionsMap }: ClothingItemsListProps) {
  // Extraer solo los params de esta tabla (quitar prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, TABLE_ID);

  // Facets se cargan lazy (on-demand al abrir cada popover) — no en SSR
  const [{ data, total }, preferences] = await Promise.all([
    getClothingItemsPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_ClothingItemsDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          permissionsMap={permissionsMap}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
