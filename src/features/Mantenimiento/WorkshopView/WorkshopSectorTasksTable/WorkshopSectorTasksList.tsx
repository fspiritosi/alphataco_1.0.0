import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { _WorkshopSectorTasksDataTable } from './_WorkshopSectorTasksDataTable';
import { getWorkshopSectorWorkOrdersPaginated } from './actions.server';

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
 * Se instancia una vez por sector de taller en el acordeón de la Vista Taller y
 * lista las ÓRDENES DE TRABAJO abiertas del sector (ticket 678).
 *
 * tableId único por sector para que los URL params de cada tabla en la página no
 * interfieran entre sí. El prefijo cambió respecto de la versión que listaba
 * tareas: las columnas ya no son las mismas, así que reutilizar las preferencias
 * guardadas dejaría visibilidades apuntando a columnas que ya no existen.
 */
export async function WorkshopSectorTasksList({ sectorId, searchParams }: WorkshopSectorTasksListProps) {
  const tableId = `workshop-sector-work-orders-${sectorId}`;

  // Strip del namespace antes de parsear los searchParams de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, tableId);

  const [{ data, total }, preferences] = await Promise.all([
    getWorkshopSectorWorkOrdersPaginated(sectorId, tableParams),
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
