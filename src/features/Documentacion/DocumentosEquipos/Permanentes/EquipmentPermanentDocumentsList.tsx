import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getEquipmentPermanentDocumentsPaginated } from './actions.server';
import { _EquipmentPermanentDocumentsDataTable } from './components/_EquipmentPermanentDocumentsDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TABLE_ID = 'equipment-permanent-docs';

// ============================================================================
// TYPES
// ============================================================================

interface EquipmentPermanentDocumentsListProps {
  searchParams: Record<string, string | string[] | undefined>;
  equipmentId?: string;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function EquipmentPermanentDocumentsList({ searchParams, equipmentId }: EquipmentPermanentDocumentsListProps) {
  // Extraer solo los params de esta tabla (quitar prefijo)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, TABLE_ID);

  const [{ data, total }, preferences] = await Promise.all([
    getEquipmentPermanentDocumentsPaginated(tableParams, equipmentId),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_EquipmentPermanentDocumentsDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
          equipmentId={equipmentId}
        />
      </CardContent>
    </Card>
  );
}
