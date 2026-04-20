import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { _WorkshopSectorTasksDataTable } from './_WorkshopSectorTasksDataTable';
import { getWorkshopSectorTasksPaginated } from './actions.server';

// ============================================================================
// PROPS
// ============================================================================

interface WorkshopSectorTasksListProps {
  /** ID del sector de taller — filtro base obligatorio. */
  sectorId: string;
  /** Todos los searchParams de la URL. Se aplica stripPrefix con el tableId. */
  searchParams: DataTableSearchParams;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

/**
 * WorkshopSectorTasksList — Server Component.
 *
 * Se instancia una vez por sector de taller en el acordeón de la vista Workshop.
 * El parent NO debe montarlo mientras el acordeón esté colapsado (condicional en el parent).
 *
 * tableId único por sector para que los URL params de cada tabla en la página
 * no interfieran entre sí.
 */
export async function WorkshopSectorTasksList({ sectorId, searchParams }: WorkshopSectorTasksListProps) {
  // tableId único por sector — aísla URL params y preferencias de BD
  const tableId = `workshop-sector-tasks-${sectorId}`;

  // Strip del namespace antes de parsear los searchParams de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, tableId);

  const [{ data, total }, preferences] = await Promise.all([
    getWorkshopSectorTasksPaginated(sectorId, tableParams),
    getTablePreferences(tableId),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_WorkshopSectorTasksDataTable
          sectorId={sectorId}
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={tableId}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
